// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

afterEach(cleanup);

test("a disabled native button cannot invoke the action", () => {
  const action = vi.fn();
  render(createElement(Button, { disabled: true, onClick: action }, "Tạo chuyến đi"));
  const button = screen.getByRole("button", { name: "Tạo chuyến đi" }) as HTMLButtonElement;
  expect(button.disabled).toBe(true); fireEvent.click(button); expect(action).not.toHaveBeenCalled();
});

test("asChild retains a focusable native destination link", () => {
  render(createElement(Button, { asChild: true }, createElement("a", { href: "/destinations/da-lat" }, "Khám phá Đà Lạt")));
  const link = screen.getByRole("link", { name: "Khám phá Đà Lạt" });
  expect(link.getAttribute("href")).toBe("/destinations/da-lat");
  expect(screen.queryByRole("button")).toBeNull(); link.focus(); expect(document.activeElement).toBe(link);
});
