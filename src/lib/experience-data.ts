export interface Experience {
  id: string
  title: string
  company: string
  location: {
    city: string
    country: string
    lat: number
    lng: number
    isRemote: boolean
  }
  startDate: string
  endDate: string
  color: "pink" | "yellow" | "green" | "blue"
}

export const experiences: Experience[] = [
  {
    id: "1",
    title: "Warung Sederhana",
    company: "UMKM Kuliner",
    location: {
      city: "Jakarta",
      country: "Indonesia",
      lat: -6.2088,
      lng: 106.8456,
      isRemote: false,
    },
    startDate: "2024-01-01",
    endDate: "2026-11-01",
    color: "blue",
  },
  {
    id: "2",
    title: "Toko Sembako Makmur",
    company: "Ritel & Grosir",
    location: {
      city: "Surabaya",
      country: "Indonesia",
      lat: -7.2575,
      lng: 112.7521,
      isRemote: false,
    },
    startDate: "2024-02-15",
    endDate: "2026-11-01",
    color: "green",
  },
]
