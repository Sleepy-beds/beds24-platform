import type { Availability, PropertyConfig } from "../types";

/**
 * Calculate total price for a stay based on availability data.
 * Used on the client side where per-day availability is already loaded.
 */
export function calculateTotalPrice(
  checkIn: string,
  checkOut: string,
  availabilityData: Availability[],
  guests: number,
  config: Pick<PropertyConfig, "basePrice" | "extraGuestThreshold" | "extraGuestSurcharge">,
): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  let total = 0;

  const extraGuests = Math.max(0, guests - config.extraGuestThreshold);
  const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayData = availabilityData.find((a) => a.date === dateStr);
    total += dayData?.price ?? config.basePrice;
  }

  total += extraGuests * config.extraGuestSurcharge * nights;

  return total;
}
