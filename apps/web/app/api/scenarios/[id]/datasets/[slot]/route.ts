import {
  attachSampleSchema,
  datasetSlotSchema,
  uploadReportSchema,
} from "@/features/scenario-setup/schema";
import type { DatasetSlot } from "@/features/scenario-setup/types";
import { errorResponse, readJson } from "@/lib/mock/http";
import { attachDataset, attachSample, MockApiError } from "@/lib/mock/store";

type Context = { params: Promise<{ id: string; slot: string }> };

/** Reads the `slot` path segment, or throws 404 if it is not one of the four datasets. */
function parseSlot(slot: string): DatasetSlot {
  const parsed = datasetSlotSchema.safeParse(slot);
  if (!parsed.success) throw new MockApiError(404, "Unknown dataset.");
  return parsed.data;
}

/**
 * Mock `POST /api/scenarios/{id}/datasets/{slot}`: uploads a file (multipart form with a
 * `file` field and a `report` field holding the browser's validation result as JSON).
 * Only the file's name and size are kept. Responds 201 with the stored dataset.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const { id, slot } = await params;
  try {
    const datasetSlot = parseSlot(slot);

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      throw new MockApiError(400, "Attach a file in the 'file' field.");
    }

    let reportJson: unknown;
    try {
      reportJson = JSON.parse(String(form?.get("report") ?? ""));
    } catch {
      throw new MockApiError(400, "The 'report' field must be valid JSON.");
    }
    const report = uploadReportSchema.safeParse(reportJson);
    if (!report.success) throw new MockApiError(400, "The 'report' field is not valid.");

    const record = attachDataset(id, {
      slot: datasetSlot,
      fileName: file.name,
      source: "upload",
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
      ...report.data,
    });
    return Response.json(record, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Mock `PUT /api/scenarios/{id}/datasets/{slot}`: attaches one of the built-in sample files,
 * given as `{ sampleId }`. Responds 200 with the stored dataset.
 */
export async function PUT(request: Request, { params }: Context): Promise<Response> {
  const { id, slot } = await params;
  try {
    const datasetSlot = parseSlot(slot);
    const body = attachSampleSchema.safeParse(await readJson(request));
    if (!body.success) throw new MockApiError(400, "Send the sample file as { sampleId }.");
    return Response.json(attachSample(id, datasetSlot, body.data.sampleId));
  } catch (error) {
    return errorResponse(error);
  }
}
