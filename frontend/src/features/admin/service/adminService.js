import { apiRequest, apiUrl } from "../../../shared/api/client";

export function adminRequest(path, options) {
  return apiRequest(path, options);
}

export function queryString(values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null) params.set(key, value);
  });
  return params.toString();
}

export function formatAdminPrice(value, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `${currency} ${Number(value).toLocaleString()}`;
  }
}

export function errorMessage(error) {
  return error?.message || "The request could not be completed.";
}

export async function uploadProductImage(file) {
  const token = localStorage.getItem("zohntronics-token");

  // 1. Direct upload to AWS S3 through backend (Node.js SDK with AWS .env credentials)
  // This bypasses browser S3 CORS limitations while storing directly in the AWS S3 bucket
  try {
    const directResponse = await fetch(`${apiUrl}/admin/uploads/product-images/direct`, {
      method: "POST",
      headers: {
        "Content-Type": file.type,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: file,
    });

    if (directResponse.ok) {
      const data = await directResponse.json();
      if (data?.imageUrl) {
        return data.imageUrl;
      }
    } else {
      const errData = await directResponse.json().catch(() => null);
      console.warn("Direct backend S3 upload returned status:", directResponse.status, errData);
    }
  } catch (err) {
    console.warn("Direct S3 upload through backend failed, falling back to presigned upload:", err);
  }

  // 2. Fallback to presigned S3 upload
  const { upload } = await adminRequest("/admin/uploads/product-images", {
    method: "POST",
    body: { contentType: file.type, sizeBytes: file.size },
  });

  const form = new FormData();
  Object.entries(upload.fields).forEach(([name, value]) => form.append(name, value));
  form.append("file", file);

  let response;
  try {
    response = await fetch(upload.uploadUrl, { method: "POST", body: form });
  } catch (networkError) {
    console.error("S3 network / CORS failure:", networkError);
    throw new Error(
      "Cannot connect to AWS S3. Please check bucket CORS or AWS credentials in backend/.env for " +
        window.location.origin
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("S3 upload rejected:", response.status, errorText);
    const codeMatch = errorText.match(/<Code>(.*?)<\/Code>/i);
    const messageMatch = errorText.match(/<Message>(.*?)<\/Message>/i);
    const s3Error = (codeMatch ? codeMatch[1] : "") + (messageMatch ? `: ${messageMatch[1]}` : "");
    throw new Error(s3Error ? `AWS S3 error (${s3Error})` : `AWS S3 upload failed with status ${response.status}`);
  }

  return upload.imageUrl;
}

export const adminService = {
  adminRequest,
  queryString,
  formatAdminPrice,
  errorMessage,
  uploadProductImage,
};

export default adminService;
