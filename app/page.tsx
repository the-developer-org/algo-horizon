import { HistoricalInsights } from "../components/HistoricalInsights";
import Link from "next/link";

export default function Home() {
  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `url('https://images.pexels.com/photos/730547/pexels-photo-730547.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')`,
      }}
    >
      <div className="min-h-screen bg-black bg-opacity-60">
        <div className="container mx-auto px-4 py-8">
          <div
            className="text-4xl font-bold mb-8 text-center text-white-200 uppercase mx-auto bg-purple-200 p-4 rounded-lg "
            style={{
              width: "max-content",
              paddingLeft: "80px",
              backgroundColor: "rgba(19, 191, 73, 0.42)", // Correct RGBA usage
            }}
          >
            <span style={{ letterSpacing: "80px" }}>AlgoHorizon</span>
          </div>

          <HistoricalInsights />
        </div>
      </div>
    </div>
  );
}
