/**
 * Site-wide background wash. Three large blurred colour blobs sitting behind all
 * content, fixed so they stay put while the page scrolls.
 *
 * Light mode is the reason this exists: a flat cream page reads as empty, while a
 * dark page gets depth for free. Opacities are tuned down in dark mode so the same
 * layer does not overpower the darker surface.
 */
export default function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 -left-24 h-[520px] w-[520px] rounded-full bg-[#6B9BD1] opacity-[0.18] blur-[120px] dark:opacity-[0.13]" />
      <div className="absolute top-[45%] -right-32 h-[460px] w-[460px] rounded-full bg-[#D9A441] opacity-[0.14] blur-[130px] dark:opacity-[0.10]" />
      <div className="absolute -bottom-40 left-[25%] h-[420px] w-[420px] rounded-full bg-[#B58BD1] opacity-[0.12] blur-[130px] dark:opacity-[0.09]" />
    </div>
  )
}
