export const destinations = [
  {
    slug: "nha-trang",
    name: "Nha Trang",
    timezone: "Asia/Ho_Chi_Minh",
    eyebrow: "Mặn mòi một chút",
    description: "Chạm sóng xanh, dạo phố biển, chừa một khoảng thảnh thơi.",
    theme: "ocean",
  },
  {
    slug: "da-lat",
    name: "Đà Lạt",
    timezone: "Asia/Ho_Chi_Minh",
    eyebrow: "Chậm thêm một nhịp",
    description: "Qua những triền thông, ghé góc nhỏ, tận hưởng chút se lạnh.",
    theme: "forest",
  },
] as const;

export type Destination = (typeof destinations)[number];
export type DestinationSlug = Destination["slug"];

export function findDestination(slug: string): Destination | undefined {
  return destinations.find((destination) => destination.slug === slug);
}
