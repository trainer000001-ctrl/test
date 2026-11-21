use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

pub const TRAY_ID: &str = "rocksoul-tray";
pub const TRAY_MENU_OPEN: &str = "tray_open";
pub const TRAY_MENU_HIDE: &str = "tray_hide";
pub const TRAY_MENU_QUIT: &str = "tray_quit";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TrayMenuAction {
    Open,
    Hide,
    Quit,
}

pub fn resolve_tray_menu_action(id: &str) -> Option<TrayMenuAction> {
    match id {
        TRAY_MENU_OPEN => Some(TrayMenuAction::Open),
        TRAY_MENU_HIDE => Some(TrayMenuAction::Hide),
        TRAY_MENU_QUIT => Some(TrayMenuAction::Quit),
        _ => None,
    }
}

pub fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn hide_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

pub fn toggle_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let visible = window.is_visible().unwrap_or(false);
        let minimized = window.is_minimized().unwrap_or(false);
        if visible && !minimized {
            hide_main_window(app);
        } else {
            show_main_window(app);
        }
    }
}

pub fn init_system_tray(app: &AppHandle) -> tauri::Result<()> {
    let open_item = MenuItem::with_id(
        app,
        TRAY_MENU_OPEN,
        "Open ROCKSOUL - DX",
        true,
        None::<&str>,
    )?;
    let hide_item = MenuItem::with_id(
        app,
        TRAY_MENU_HIDE,
        "Hide to System Tray",
        true,
        None::<&str>,
    )?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(
        app,
        TRAY_MENU_QUIT,
        "Quit ROCKSOUL - DX",
        true,
        None::<&str>,
    )?;
    let menu = Menu::with_items(app, &[&open_item, &hide_item, &separator, &quit_item])?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .tooltip("ROCKSOUL - DX · Sovereign Operator Studio")
        .show_menu_on_left_click(false)
        .on_menu_event(
            |app_handle, event| match resolve_tray_menu_action(event.id().as_ref()) {
                Some(TrayMenuAction::Open) => show_main_window(app_handle),
                Some(TrayMenuAction::Hide) => hide_main_window(app_handle),
                Some(TrayMenuAction::Quit) => {
                    app_handle
                        .state::<crate::commands::dev_control::DevServicesState>()
                        .stop_all_managed();
                    app_handle.exit(0);
                }
                None => {}
            },
        )
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_main_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{
        resolve_tray_menu_action, TrayMenuAction, TRAY_MENU_HIDE, TRAY_MENU_OPEN, TRAY_MENU_QUIT,
    };

    #[test]
    fn resolves_known_tray_menu_actions_and_ignores_unknown() {
        assert_eq!(
            resolve_tray_menu_action(TRAY_MENU_OPEN),
            Some(TrayMenuAction::Open)
        );
        assert_eq!(
            resolve_tray_menu_action(TRAY_MENU_HIDE),
            Some(TrayMenuAction::Hide)
        );
        assert_eq!(
            resolve_tray_menu_action(TRAY_MENU_QUIT),
            Some(TrayMenuAction::Quit)
        );
        assert_eq!(resolve_tray_menu_action("unknown"), None);
    }
}
