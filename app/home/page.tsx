import { UpstoxConnection } from "../components/UpstoxConnection";

export default function HomeScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
  
      <UpstoxConnection />
      {/* Empty dashboard - add widgets/components here as needed */}
    </div>
  );
}
