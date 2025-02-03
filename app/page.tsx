"use client";
import { HistoricalInsights } from "../components/HistoricalInsights";


export default function Home() {
  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `url('https://images.pexels.com/photos/730547/pexels-photo-730547.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')`,
      }}
    >
      <div className="min-h-screen bg-black bg-opacity-60">
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 flex flex-col items-center justify-center">
          <div
            className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-8 text-center text-white-200 uppercase mx-auto bg-purple-200 p-2 sm:p-4 rounded-lg max-w-full"
            style={{
              paddingLeft: "20px",
              paddingRight: "20px",
              backgroundColor: "rgba(19, 191, 73, 0.42)",
            }}
          >
            <span style={{ letterSpacing: "0.5em" }} className="inline-block">
              AlgoHorizon
            </span>
          </div>

          <HistoricalInsights />
        </div>
      </div>
    </div>
  )
}
