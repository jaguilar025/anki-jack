"use client";

import InfiniteMenu from "./InfiniteMenu";
import voices from "@/lib/voices.json";

const items = voices;

export default function LandingPage() {
  return (
    <div className="h-full w-full">
      <InfiniteMenu items={items} />
    </div>
  );
}
