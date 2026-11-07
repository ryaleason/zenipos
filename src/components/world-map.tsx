"use client"

import Image from "next/image"

export function WorldMap() {
  return (
    <div className="relative w-full h-full flex items-center justify-center py-2">
      <div className="relative w-full max-w-[1050px] h-auto">
        <Image
          src="/map.svg"
          alt="Peta Sebaran Usaha"
          width={1138}
          height={640}
          className="w-full h-auto opacity-80"
        />
      </div>
    </div>
  )
}
