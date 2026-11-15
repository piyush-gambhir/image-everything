import "@testing-library/jest-dom/vitest"
import type { ImgHTMLAttributes } from "react"
import { vi } from "vitest"

const tailwindBlock = document.createElement("style")
tailwindBlock.textContent = ".block { display: block; }"
document.head.appendChild(tailwindBlock)

Object.defineProperty(URL, "createObjectURL", {
  configurable: true,
  value: vi.fn(() => "blob:test"),
})
Object.defineProperty(URL, "revokeObjectURL", {
  configurable: true,
  value: vi.fn(),
})

vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }
  },
  usePathname() {
    return "/"
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt ?? ""} />
  },
}))
