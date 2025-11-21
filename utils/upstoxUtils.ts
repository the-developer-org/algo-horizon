 const isMarketHours = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    
    // Get current time in IST
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const currentHour = istTime.getHours();
    const currentMinute = istTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    // Market hours: 9:15 AM (555 minutes) to 3:30 PM (930 minutes)
    const marketStart = 9 * 60 + 15; // 9:15 AM = 555 minutes
    const marketEnd = 15 * 60 + 30;  // 3:30 PM = 930 minutes
    //console.log(`Current IST Time: ${currentHour}:${currentMinute < 10 ? '0' : ''}${currentMinute} (${currentTimeMinutes} minutes)`);
    //console.log(`Market Hours: ${marketStart} to ${marketEnd} minutes`);
    return currentTimeMinutes >= marketStart && currentTimeMinutes <= marketEnd;
  };

  export { isMarketHours };