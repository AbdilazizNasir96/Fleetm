import path from "path";
import fs from "fs/promises";
import multer from "multer";

export const storageDriver: "azure" | "local" =
  process.env["AZURE_STORAGE_CONNECTION_STRING"] ? "azure" : "local";

export const uploadDir = process.env["LOCAL_STORAGE_PATH"] || "./uploads";

export async function ensureUploadDir(): Promise<void> {
  if (storageDriver === "local") {
    await fs.mkdir(uploadDir, { recursive: true });
  }
}

export const upload = multer({ storage: multer.memoryStorage() });

export async function getUploadUrl(
  blobName: string,
  contentType: string
): Promise<{ uploadUrl: string | null; blobUrl: string }> {
  if (storageDriver === "azure") {
    const { BlobServiceClient, generateBlobSASQueryParameters, StorageSharedKeyCredential, BlobSASPermissions } =
      await import("@azure/storage-blob");
    const connStr = process.env["AZURE_STORAGE_CONNECTION_STRING"]!;
    const containerName = process.env["AZURE_STORAGE_CONTAINER_NAME"] || "incidents";
    const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const accountName = blobServiceClient.accountName;
    const accountKey = connStr.match(/AccountKey=([^;]+)/)?.[1] ?? "";
    const credential = new StorageSharedKeyCredential(accountName, accountKey);

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse("w"),
        startsOn: new Date(),
        expiresOn: new Date(Date.now() + 5 * 60 * 1000),
        contentType,
      },
      credential
    ).toString();

    return {
      uploadUrl: `${blockBlobClient.url}?${sasToken}`,
      blobUrl: blockBlobClient.url,
    };
  }

  return { uploadUrl: null, blobUrl: `/api/uploads/${blobName}` };
}

export async function saveLocalFile(blobName: string, buffer: Buffer): Promise<void> {
  const filePath = path.join(uploadDir, blobName);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
}
