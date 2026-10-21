import { success, withApi } from "@/lib/api/http.server";

export function GET(request: Request) {
  return withApi(request, (id) => success({ status: "ok" }, id));
}
