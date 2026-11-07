"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Menu,
  X,
  ChevronDown,
  ShoppingBag,
  Package,
  BarChart3,
  WifiOff,
} from "lucide-react"
import { WorldMap } from "@/components/world-map"

const BUSINESS_TYPES_LIST = [
  "Warung Makan",
  "Toko Kelontong",
  "Kedai Kopi",
  "Laundry Kiloan",
  "Toko Bangunan",
  "Apotek & Toko Obat",
  "Bengkel Motor",
  "Toko Pakaian",
]

const DYNAMIC_WORDS = [
  "warung makan",
  "toko kelontong",
  "kedai kopi",
  "laundry kiloan",
  "toko pakaian",
  "bengkel motor",
  "toko bangunan",
]

function AnimatedCounter({ value }: { value: string }) {
  const [displayValue, setDisplayValue] = useState("0")
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const numericStr = value.replace(/[^0-9.]/g, "")
          const targetNum = Number.parseFloat(numericStr)
          const unit = value.replace(/[0-9.]/g, "")

          if (Number.isNaN(targetNum)) {
            setDisplayValue(value)
            observer.disconnect()
            return
          }

          let current = 0
          const increment = targetNum / 40
          const interval = setInterval(() => {
            current += increment
            if (current >= targetNum) {
              setDisplayValue(`${targetNum}${unit}`)
              clearInterval(interval)
            } else {
              setDisplayValue(`${Math.floor(current)}${unit}`)
            }
          }, 25)

          observer.disconnect()
        }
      },
      { threshold: 0.5 },
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value])

  return <span ref={ref}>{displayValue}</span>
}

export default function ZeniPosLandingPage() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState(0)
  const [imageFade, setImageFade] = useState(true)
  const [autoRotationKey, setAutoRotationKey] = useState(0)
  const [dynamicWordIndex, setDynamicWordIndex] = useState(0)
  const [wordFade, setWordFade] = useState(true)
  const [scrollY, setScrollY] = useState(0)
  const [dashboardScrollOffset, setDashboardScrollOffset] = useState(0)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)
  const dashboardRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver>(null)

  useEffect(() => {
    const wordInterval = setInterval(() => {
      setWordFade(false)
      setTimeout(() => {
        setDynamicWordIndex((prev) => (prev + 1) % DYNAMIC_WORDS.length)
        setWordFade(true)
      }, 250)
    }, 2800)

    return () => clearInterval(wordInterval)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
      if (dashboardRef.current) {
        const dashboardRect = dashboardRef.current.getBoundingClientRect()
        const viewportHeight = window.innerHeight

        const rotationStart = viewportHeight * 0.8
        const rotationEnd = viewportHeight * 0.2

        if (dashboardRect.top >= rotationStart) {
          setDashboardScrollOffset(0)
        } else if (dashboardRect.top <= rotationEnd) {
          setDashboardScrollOffset(8)
        } else {
          const scrollRange = rotationStart - rotationEnd
          const currentProgress = rotationStart - dashboardRect.top
          const offset = (currentProgress / scrollRange) * 8
          setDashboardScrollOffset(Math.min(Math.max(offset, 0), 8))
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setIsLoaded(true)
    })

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in")
          }
        })
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    )

    document.querySelectorAll(".animate-on-scroll").forEach((el) => {
      observerRef.current?.observe(el)
    })

    return () => {
      cancelAnimationFrame(raf)
      observerRef.current?.disconnect()
    }
  }, [])

  useEffect(() => {
    const featuresCount = 4

    const interval = setInterval(() => {
      setImageFade(false)
      setTimeout(() => {
        setSelectedFeature((prev) => (prev + 1) % featuresCount)
        setImageFade(true)
      }, 300)
    }, 6000)

    return () => clearInterval(interval)
  }, [autoRotationKey])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
    setIsMenuOpen(false)
  }

  const features = [
    {
      title: "Kasir Cepat",
      desc: "Catat transaksi dalam hitungan detik. Cetak struk via printer Bluetooth atau kirim nota digital langsung ke WhatsApp pelanggan.",
      icon: ShoppingBag,
      image: "/drone.png",
    },
    {
      title: "Stok Otomatis",
      desc: "Jumlah stok produk berkurang otomatis saat terjual. Dapatkan peringatan dini saat persediaan barang dagangan mulai menipis.",
      icon: Package,
      image: "/real-time-satellite.png",
    },
    {
      title: "Laporan Laba",
      desc: "Ketahui omzet penjualan, total pengeluaran belanja modal, dan laba bersih harian tanpa rumus rumit atau rekap nota manual.",
      icon: BarChart3,
      image: "/biodiversity-tracking.png",
    },
    {
      title: "Mode Offline",
      desc: "Kasir tetap beroperasi normal melayani pelanggan saat internet putus atau listrik padam. Data otomatis tersinkron saat online.",
      icon: WifiOff,
      image: "/deforestation-detect.png",
    },
  ]

  const metrics = [
    { label: "FITUR INTI", value: "5", desc: "Kasir, stok, kas, piutang & laba rugi" },
    { label: "PERAN AKUN", value: "2", desc: "1 akses pemilik dan 1 akses kasir" },
    { label: "MODE OFFLINE", value: "100%", desc: "Kasir tetap jalan tanpa kuota internet" },
    { label: "DASHBOARD", value: "1", desc: "Pantau omzet semua cabang dari smartphone" },
  ]

  const faqs = [
    {
      question: "Bagaimana cara mendaftar akun ZeniPOS?",
      answer:
        "Pendaftaran dilakukan melalui tim admin kami via WhatsApp. Kami akan membantu pengaturan awal jenis usaha, pembuatan akun pemilik, serta panduan memasukkan daftar produk dagangan Anda.",
    },
    {
      question: "Apakah kasir bisa digunakan saat internet mati?",
      answer:
        "Bisa. ZeniPOS dilengkapi mode offline 100%. Transaksi kasir dan cetak struk tetap berjalan normal di toko, dan seluruh riwayat transaksi otomatis tersinkronisasi ke server cloud begitu internet tersambung kembali.",
    },
    {
      question: "Berapa banyak akun yang didapatkan untuk setiap usaha?",
      answer:
        "Setiap lisensi toko mendapatkan 2 peran akun: 1 akun Pemilik untuk mengontrol stok, memantau laporan laba kotor/bersih, dan mengubah harga; serta 1 akun Kasir yang dibatasi khusus untuk operasional transaksi penjualan harian.",
    },
    {
      question: "Apakah data transaksi dan catatan keuangan saya aman?",
      answer:
        "Sangat aman. Seluruh data transaksi dan stok dienkripsi serta disimpan di server cloud dengan pencadangan berkala, sehingga data toko Anda tidak akan hilang meski perangkat smartphone berganti atau rusak.",
    },
    {
      question: "Bagaimana cara pembayaran dan perpanjangan langganan?",
      answer:
        "Biaya langganan sangat terjangkau untuk UMKM. Pembayaran perpanjangan langganan bulanan atau tahunan dapat dilakukan via transfer bank lokal maupun QRIS langsung ke admin resmi ZeniPOS.",
    },
    {
      question: "Apakah ZeniPOS bisa digunakan langsung dari smartphone (HP)?",
      answer:
        "Ya, ZeniPOS dirancang responsif penuh dan ringan. Anda bisa mengoperasikannya dengan nyaman dari HP Android, iPhone, tablet, maupun laptop tanpa perlu membeli komputer kasir yang mahal.",
    },
  ]

  return (
    <div className="relative min-h-screen bg-bg text-text overflow-x-hidden">
      {/* Navigation Header */}
      <header className="fixed top-6 left-6 md:w-auto md:right-auto right-6 z-40 border border-border bg-bg rounded-[16px] shadow-xs">
        <div className="w-full mx-auto px-6">
          <div className="flex items-center gap-6 md:h-14 h-14">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-lg md:text-xl font-bold font-mono text-text hover:text-primary transition-colors duration-300"
            >
              ZeniPOS
            </button>

            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => scrollToSection("features")}
                className="text-sm text-text-muted hover:text-text transition-colors duration-300 cursor-pointer"
              >
                Fitur
              </button>
              <button
                onClick={() => scrollToSection("stats")}
                className="text-sm text-text-muted hover:text-text transition-colors duration-300 cursor-pointer"
              >
                Cara Kerja
              </button>
              <button
                onClick={() => scrollToSection("map")}
                className="text-sm text-text-muted hover:text-text transition-colors duration-300 cursor-pointer"
              >
                Jenis Usaha
              </button>
              <button
                onClick={() => scrollToSection("faq")}
                className="text-sm text-text-muted hover:text-text transition-colors duration-300 cursor-pointer"
              >
                FAQ
              </button>
              <button
                onClick={() => scrollToSection("cta")}
                className="text-sm text-text-muted hover:text-text transition-colors duration-300 cursor-pointer"
              >
                Hubungi
              </button>
              <Link
                href="/dashboard"
                className="text-sm text-text-muted hover:text-text transition-colors duration-300"
              >
                Dashboard
              </Link>
              <Link
                href="/login"
                className="text-sm px-4 py-1.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary transition-colors duration-300 font-medium shadow-xs"
              >
                Masuk
              </Link>
            </nav>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden ml-auto p-2 text-text hover:bg-bg-subtle rounded-lg transition-colors duration-300"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-bg z-50 flex flex-col items-start justify-end pb-20 pt-20 px-6 border-b border-border">
          <div className="flex flex-col gap-6 items-start text-left w-full">
            <button
              onClick={() => scrollToSection("features")}
              className="font-serif text-4xl font-normal text-text hover:text-primary transition-colors duration-300 text-left"
            >
              Fitur
            </button>
            <button
              onClick={() => scrollToSection("stats")}
              className="font-serif text-4xl font-normal text-text hover:text-primary transition-colors duration-300 text-left"
            >
              Cara Kerja
            </button>
            <button
              onClick={() => scrollToSection("map")}
              className="font-serif text-4xl font-normal text-text hover:text-primary transition-colors duration-300 text-left"
            >
              Jenis Usaha
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="font-serif text-4xl font-normal text-text hover:text-primary transition-colors duration-300 text-left"
            >
              FAQ
            </button>
            <button
              onClick={() => scrollToSection("cta")}
              className="font-serif text-4xl font-normal text-text hover:text-primary transition-colors duration-300 text-left"
            >
              Hubungi
            </button>
            <Link
              href="/dashboard"
              className="font-serif text-4xl font-normal text-text hover:text-primary transition-colors duration-300 text-left"
            >
              Dashboard
            </Link>
            <Link
              href="/login"
              className="font-serif text-4xl font-normal text-primary hover:text-primary-hover transition-colors duration-300 text-left"
            >
              Masuk
            </Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section
        ref={heroRef}
        className={`relative min-h-screen flex flex-col items-center justify-center px-4 pt-28 pb-16 md:pt-36 md:pb-24 transition-all duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        style={{
          backgroundImage: `url('/hero-landscape.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translateY(${scrollY * 0.5}px)`,
            backgroundImage: `url('/hero-landscape.png')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/85 to-bg/40 pointer-events-none" />

        <div
          className="max-w-[1120px] w-full mx-auto relative z-10 text-center"
          style={{
            transform: `translateY(${scrollY * 0.2}px)`,
          }}
        >

          <h1 className="font-serif text-[42px] leading-[1.12] md:text-[72px] md:leading-[1.08] font-normal mb-6 text-balance text-text max-w-[900px] mx-auto">
            Catat jualan, rapikan usaha.
          </h1>

          <p
            className="text-text-muted text-base md:text-lg max-w-[580px] mx-auto mb-10 leading-relaxed stagger-reveal"
            style={{ animationDelay: "150ms" }}
          >
            Kasir, stok, pengeluaran, dan laporan laba untuk UMKM. Bisa dipakai dari HP, bahkan saat internet putus.
          </p>

          <div
            className="stagger-reveal flex flex-col sm:flex-row items-center justify-center gap-4 mb-4"
            style={{ animationDelay: "240ms" }}
          >
            <Button
              asChild
              className="w-full sm:w-auto px-8 py-6 text-base rounded-full bg-primary hover:bg-primary-hover text-on-primary font-medium transition-colors shadow-xs cursor-pointer"
            >
              <a
                href="https://wa.me/6281234567890?text=Halo%20Admin%20ZeniPOS,%20saya%20tertarik%20menggunakan%20aplikasi%20ZeniPOS."
                target="_blank"
                rel="noopener noreferrer"
              >
                Hubungi Kami
              </a>
            </Button>
            <Button
              onClick={() => scrollToSection("features")}
              variant="outline"
              className="w-full sm:w-auto px-8 py-6 text-base rounded-full border border-border bg-bg hover:bg-bg-subtle text-text font-medium transition-colors cursor-pointer"
            >
              Lihat Fitur
            </Button>
          </div>

          <p className="text-xs text-text-faint mt-4 mb-12">
            Dirancang khusus untuk pemilik{" "}
            <span
              className={`font-semibold text-text transition-opacity duration-300 ${
                wordFade ? "opacity-100" : "opacity-0"
              }`}
            >
              {DYNAMIC_WORDS[dynamicWordIndex]}
            </span>
          </p>

          {/* Dashboard Mockup */}
          <div
            className="mt-6 md:mt-12 stagger-reveal"
            style={{ animationDelay: "320ms" }}
            ref={dashboardRef}
          >
            <div style={{ perspective: "1200px" }}>
              <div
                className="relative aspect-[16/10] md:aspect-[16/9] rounded-[24px] overflow-hidden border border-border shadow-xs bg-bg-subtle"
                style={{
                  transform: `rotateX(${dashboardScrollOffset}deg)`,
                  transformStyle: "preserve-3d",
                  transition: "transform 0.05s linear",
                }}
              >
                <Image
                  src="/dashboard-screenshot.png"
                  alt="ZeniPOS Dashboard Kasir dan Pembukuan"
                  width={1120}
                  height={630}
                  priority
                  className="object-cover dashboard-image w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By / Jenis Usaha Row */}
      <section className="relative py-8 border-y border-border bg-bg-subtle overflow-hidden">
        <div className="max-w-[1120px] mx-auto px-4 text-center">
          <p className="text-xs md:text-sm uppercase tracking-[0.2em] text-text-faint mb-6 font-medium">
            Dipercaya berbagai jenis usaha harian
          </p>
          <div className="logo-marquee">
            <div className="logo-marquee-content flex gap-8 md:gap-12 items-center">
              {BUSINESS_TYPES_LIST.concat(BUSINESS_TYPES_LIST).map((business, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-sm md:text-base font-medium text-text-muted whitespace-nowrap px-4 py-2 bg-bg rounded-lg border border-border"
                >
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>{business}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section id="stats" className="relative py-20 md:py-32 px-4 animate-on-scroll md:pt-24 md:pb-20 bg-bg">
        <div className="max-w-[1120px] w-full mx-auto">
          <h2 className="font-serif text-[32px] leading-[1.15] md:text-[48px] md:leading-[1.1] font-normal mb-6 md:mb-8 text-center text-balance text-text">
            ZeniPOS dibuat untuk usaha kecil.
          </h2>

          <p className="text-text-muted text-sm md:text-base mb-12 md:mb-16 text-center max-w-[600px] mx-auto leading-relaxed">
            Sistem kasir dan pencatatan penjualan yang dirancang praktis, hemat biaya, dan siap pakai.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 max-w-[800px] mx-auto">
            {metrics.map((metric, i) => (
              <div
                key={i}
                className="p-6 md:p-10 text-center border-b border-border md:py-10 md:pb-20"
              >
                <div
                  className="text-[10px] md:text-xs uppercase tracking-[0.15em] text-text-faint mb-4 flex items-center justify-center gap-2 font-medium"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {metric.label}
                </div>
                <div className="font-serif text-[48px] md:text-[72px] leading-none font-medium text-text">
                  <AnimatedCounter value={metric.value} />
                </div>
                <div className="text-[11px] md:text-xs text-text-muted mt-3 font-normal">{metric.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Dari Warung Sampai Toko (Peta) */}
      <section id="map" className="relative py-20 md:py-32 animate-on-scroll bg-bg-subtle border-y border-border">
        <div className="max-w-[1120px] mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <div className="text-[11px] md:text-xs uppercase tracking-[0.15em] text-text-faint mb-4 flex items-center justify-center gap-2 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>CAKUPAN USAHA</span>
            </div>
            <h2 className="font-serif text-[32px] leading-[1.15] md:text-[48px] md:leading-[1.1] font-normal text-text mb-4 text-balance">
              Dari warung sampai toko.
            </h2>
            <p className="text-text-muted text-sm md:text-base max-w-[640px] mx-auto leading-relaxed">
              Dirancang sederhana agar cocok untuk berbagai jenis usaha ritel dan jasa harian di seluruh Indonesia.
            </p>
          </div>

          <WorldMap />
        </div>
      </section>

      {/* Section Fitur Utama */}
      <section id="features" className="relative py-20 md:py-32 px-4 animate-on-scroll bg-bg">
        <div className="max-w-[1120px] w-full mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-stretch">
            <div className="max-w-[720px]">
              <div className="text-[10px] md:text-xs uppercase tracking-[0.15em] text-text-faint mb-6 flex items-center gap-2 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>KEMUDAHAN OPERASIONAL</span>
              </div>
              <h2 className="font-serif text-[32px] leading-[1.15] md:text-[48px] md:leading-[1.1] font-normal text-text mb-6 text-balance">
                Semua kebutuhan kasir dalam satu genggaman.
              </h2>
              <p className="text-text-muted text-base md:text-lg leading-relaxed mb-12">
                Tak perlu lagi buku catatan tebal atau kalkulator terpisah. Semua data penjualan, persediaan stok, dan laba terekam rapi otomatis.
              </p>

              <div className="md:hidden mb-8">
                <div className="rounded-[24px] p-1 w-full aspect-square overflow-hidden">
                  <Image
                    src={features[selectedFeature]?.image || "/placeholder.svg"}
                    alt="Feature preview"
                    width={400}
                    height={400}
                    className={`w-full h-full object-cover rounded-[20px] border border-border transition-opacity duration-300 ${
                      imageFade ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {features.map((feature, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setImageFade(false)
                      setTimeout(() => {
                        setSelectedFeature(i)
                        setImageFade(true)
                        setAutoRotationKey((prev) => prev + 1)
                      }, 300)
                    }}
                    className={`relative w-full text-left flex gap-4 items-start p-5 transition-all duration-300 rounded-xl py-4 overflow-hidden border cursor-pointer ${
                      selectedFeature === i
                        ? "border-primary/30 bg-primary-soft"
                        : "border-border bg-bg hover:border-text-faint"
                    }`}
                  >
                    <feature.icon
                      className={`w-6 h-6 flex-shrink-0 mt-1 transition-colors ${
                        selectedFeature === i ? "text-primary" : "text-text-muted"
                      }`}
                    />
                    <div className="flex-1">
                      <h3 className="text-base md:text-lg font-medium mb-1 text-text">{feature.title}</h3>
                      <p className="text-sm md:text-base text-text-muted">{feature.desc}</p>
                    </div>
                    {selectedFeature === i && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-border">
                        <div className="h-full bg-primary progress-bar" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden md:flex items-stretch justify-center">
              <div className="relative w-full h-full min-h-[500px]">
                {features.map((feature, i) => {
                  const positionInStack = (i - selectedFeature + 4) % 4
                  const isActive = positionInStack === 0

                  return (
                    <div
                      key={i}
                      className="absolute inset-0 p-1 transition-all duration-600 ease-out"
                      style={{
                        zIndex: 4 - positionInStack,
                        transform: `translateX(${positionInStack * 16}px) scale(${1 - positionInStack * 0.02})`,
                        opacity: isActive ? (imageFade ? 1 : 1) : 0.6 - positionInStack * 0.15,
                      }}
                    >
                      <Image
                        src={feature.image || "/placeholder.svg"}
                        alt={feature.title}
                        width={600}
                        height={600}
                        className="w-full h-full object-cover rounded-[20px] border border-border shadow-xs"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section FAQ */}
      <section id="faq" className="relative py-20 md:py-32 animate-on-scroll bg-bg-subtle border-y border-border">
        <div className="max-w-[820px] mx-auto px-4">
          <div className="text-center mb-16">
            <div className="text-[11px] md:text-xs uppercase tracking-[0.15em] text-text-faint mb-4 flex items-center justify-center gap-2 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>TANYA JAWAB</span>
            </div>
            <h2 className="font-serif text-[36px] leading-[1.2] md:text-[50px] md:leading-[1.15] font-normal text-text mb-4 text-balance">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-text-muted text-sm md:text-base max-w-[600px] mx-auto leading-relaxed">
              Semua hal yang perlu Anda ketahui mengenai pendaftaran, penggunaan kasir, dan keamanan data ZeniPOS.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index

              return (
                <div
                  key={index}
                  className="bg-bg border border-border rounded-xl overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 transition-colors cursor-pointer"
                  >
                    <span className="font-medium text-text text-base md:text-lg">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 flex-shrink-0 text-text-muted transition-transform duration-300 ${
                        isOpen ? "transform rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="px-6 pb-6 text-sm md:text-base text-text-muted leading-relaxed border-t border-border pt-4">
                      {faq.answer}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Section CTA Penutup */}
      <section
        id="cta"
        className="relative py-24 md:py-40 px-4 animate-on-scroll overflow-hidden pt-16 md:pt-28"
        style={{
          backgroundImage: `url('/earth-cta.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-transparent pointer-events-none" />
        <div className="max-w-[800px] w-full mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs md:text-sm text-white/90 bg-white/10 backdrop-blur-md border border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>Mulai Sekarang</span>
          </div>

          <h2 className="font-serif text-[40px] leading-[1.15] md:text-[64px] md:leading-[1.1] font-normal mb-6 text-balance text-white">
            Siap merapikan usaha Anda?
          </h2>

          <p className="text-white/80 text-base md:text-lg mb-10 leading-relaxed max-w-[560px] mx-auto">
            Hubungi tim admin kami untuk pendaftaran akun dan pendampingan penggunaan aplikasi ZeniPOS langsung di toko Anda.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              className="w-full sm:w-auto px-8 py-6 text-base rounded-full bg-white hover:bg-white/90 text-primary font-semibold transition-colors cursor-pointer shadow-xs"
            >
              <a
                href="https://wa.me/6281234567890?text=Halo%20Admin%20ZeniPOS,%20saya%20ingin%20mendaftarkan%20usaha%20saya."
                target="_blank"
                rel="noopener noreferrer"
              >
                Hubungi Kami
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full sm:w-auto px-8 py-6 text-base rounded-full border border-white/30 bg-white/10 hover:bg-white/20 text-white font-medium transition-colors cursor-pointer backdrop-blur-xs"
            >
              <Link href="/dashboard">Lihat Demo Kasir</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-4 border-t border-border bg-bg-subtle py-12">
        <div className="max-w-[1120px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-1">
              <div className="text-xl font-bold font-mono text-text mb-3">ZeniPOS</div>
              <p className="text-xs text-text-muted leading-relaxed mb-4">
                Aplikasi pencatatan penjualan, stok otomatis, dan laporan laba praktis untuk UMKM Indonesia.
              </p>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-text-faint">Dukungan: WhatsApp Admin</span>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.15em] text-text font-semibold mb-3">
                Fitur Utama
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => scrollToSection("features")}
                  className="text-sm text-text-muted hover:text-text transition-colors text-left"
                >
                  Kasir Cepat
                </button>
                <button
                  onClick={() => scrollToSection("features")}
                  className="text-sm text-text-muted hover:text-text transition-colors text-left"
                >
                  Stok Otomatis
                </button>
                <button
                  onClick={() => scrollToSection("features")}
                  className="text-sm text-text-muted hover:text-text transition-colors text-left"
                >
                  Laporan Laba
                </button>
                <button
                  onClick={() => scrollToSection("features")}
                  className="text-sm text-text-muted hover:text-text transition-colors text-left"
                >
                  Mode Offline
                </button>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.15em] text-text font-semibold mb-3">
                Menu Cepat
              </div>
              <div className="flex flex-col gap-2">
                <Link href="/dashboard" className="text-sm text-text-muted hover:text-text transition-colors">
                  Dashboard Pemilik
                </Link>
                <Link href="/login" className="text-sm text-text-muted hover:text-text transition-colors">
                  Halaman Masuk
                </Link>
                <button
                  onClick={() => scrollToSection("faq")}
                  className="text-sm text-text-muted hover:text-text transition-colors text-left"
                >
                  Tanya Jawab (FAQ)
                </button>
                <button
                  onClick={() => scrollToSection("cta")}
                  className="text-sm text-text-muted hover:text-text transition-colors text-left"
                >
                  Hubungi Admin
                </button>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.15em] text-text font-semibold mb-3">
                Informasi & Update
              </div>
              <p className="text-xs text-text-muted mb-4 leading-relaxed">
                Dapatkan tips pembukuan dan pembaruan fitur ZeniPOS untuk kelancaran usaha Anda.
              </p>
              <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
                <input
                  type="email"
                  placeholder="Email Anda"
                  className="px-3.5 py-2 bg-bg border border-border rounded-lg text-xs text-text placeholder-text-faint focus:outline-none focus:border-primary flex-1 transition-colors"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-primary hover:bg-primary-hover text-on-primary transition-colors cursor-pointer"
                >
                  Kirim
                </button>
              </form>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-text-muted">
            <div>© 2026 ZeniPOS. Hak cipta dilindungi undang-undang.</div>
            <div className="flex gap-6">
              <a href="#cta" className="hover:text-text transition-colors">
                Bantuan
              </a>
              <a href="#faq" className="hover:text-text transition-colors">
                FAQ
              </a>
              <Link href="/dashboard" className="hover:text-text transition-colors">
                Aplikasi Kasir
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
