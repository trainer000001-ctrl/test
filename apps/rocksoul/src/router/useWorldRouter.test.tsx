import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useWorldRouter } from "./useWorldRouter";

function RouterProbe() {
  const { destination, navigateDestination } = useWorldRouter();
  const location = useLocation();

  return (
    <>
      <p data-testid="route-state">{destination}</p>
      <p data-testid="route-path">{location.pathname}</p>
      <button type="button" onClick={() => navigateDestination("threshold")}>Enter Threshold</button>
      <button type="button" onClick={() => navigateDestination("studio")}>Open Studio</button>
      <button type="button" onClick={() => navigateDestination("threshold")}>Return to Threshold</button>
    </>
  );
}

describe("useWorldRouter", () => {
  it("maps destination paths and returns to the Threshold route", async () => {
    render(
      <MemoryRouter initialEntries={["/archive"]}>
        <RouterProbe />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("route-state")).toHaveTextContent("archive");
    fireEvent.click(screen.getByRole("button", { name: "Open Studio" }));
    await waitFor(() => expect(screen.getByTestId("route-path")).toHaveTextContent("/studio"));
    fireEvent.click(screen.getByRole("button", { name: "Return to Threshold" }));
    await waitFor(() => expect(screen.getByTestId("route-path")).toHaveTextContent("/threshold"));
    await waitFor(() => expect(screen.getByTestId("route-state")).toHaveTextContent("threshold"));
  });

  it("starts at Awakening and enters the Threshold", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <RouterProbe />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("route-state")).toHaveTextContent("awakening");
    fireEvent.click(screen.getByRole("button", { name: "Enter Threshold" }));
    await waitFor(() => expect(screen.getByTestId("route-path")).toHaveTextContent("/threshold"));
    expect(screen.getByTestId("route-state")).toHaveTextContent("threshold");
  });

  it("redirects unknown routes to Awakening", async () => {
    render(
      <MemoryRouter initialEntries={["/unknown-room"]}>
        <RouterProbe />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId("route-path")).toHaveTextContent("/"));
    expect(screen.getByTestId("route-state")).toHaveTextContent("awakening");
  });
});
