import { describe, expect, it } from "vitest";
import {
  canonicalStoragePath,
  canonicalStorageQuery,
  hasCallerSignatureQuery,
  signStorageRequest,
} from "@moonwitness/addons/storage";

describe("Storage SigV4 helpers", () => {
  it("uses the service's canonical bucket URI and encodes object path segments", () => {
    expect(canonicalStoragePath("/media")).toBe("/media/");
    expect(canonicalStoragePath("/media/folder/a%20b.txt")).toBe("/media/folder/a%20b.txt");
    expect(canonicalStoragePath("/")).toBe("/");
  });

  it("canonicalizes query values with RFC 3986 encoding and stable ordering", () => {
    expect(canonicalStorageQuery("prefix=a+b&max-keys=10&prefix=c%2Fd")).toBe(
      "max-keys=10&prefix=a%20b&prefix=c%2Fd",
    );
  });

  it("detects caller-provided S3 authentication parameters", () => {
    expect(hasCallerSignatureQuery("prefix=assets")).toBe(false);
    expect(hasCallerSignatureQuery("x-amz-signature=caller")).toBe(true);
  });

  it("creates deterministic headers for a binary Storage request", () => {
    const headers = signStorageRequest(
      "PUT",
      new URL("http://storage.example.test/media/object.bin?acl="),
      Buffer.from([0, 1, 128, 255]),
      { accessKey: "access", secretKey: "secret" },
      new Date("2026-11-14T00:00:00.000Z"),
    );

    expect(headers["x-amz-date"]).toBe("20261114T000000Z");
    expect(headers["x-amz-content-sha256"]).toBe(
      "0ff830e8c68aca18063bce54c3191d5c116a2dfe33249538b252746cb777ef10",
    );
    expect(headers.authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=access\/20261114\/us-east-1\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[a-f0-9]{64}$/,
    );
  });
});
