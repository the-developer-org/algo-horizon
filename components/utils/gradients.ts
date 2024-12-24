const getRandomGradient = () => {
    const colorPalettes = [
      ["from-slate-200", "via-slate-300", "to-slate-400"], // Sophisticated gray
      ["from-sky-200", "via-sky-300", "to-indigo-300"],    // Serene blue
      ["from-rose-200", "via-rose-300", "to-mauve-300"],   // Soft rose
      ["from-emerald-100", "via-emerald-200", "to-teal-300"], // Fresh green
    ];
  
    const randomPalette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
  
    return `bg-gradient-to-br ${randomPalette.join(' ')}`;
  };
  
  export default getRandomGradient;

//   const getGradient = (companyName: string) => {
//     const baseColors = [
//       ["from-sky-100", "via-sky-200", "to-indigo-200"],    // Serene blue
//       ["from-rose-100", "via-rose-200", "to-pink-200"],    // Soft rose
//       ["from-emerald-100", "via-emerald-200", "to-teal-200"], // Fresh green
//       ["from-violet-100", "via-violet-200", "to-purple-200"], // Gentle purple
//       ["from-slate-100", "via-slate-200", "to-slate-300"], // Sophisticated gray
//     ];
  

//     let indexIntensity: number = 0;

//     const colourCodeA : string[] = ['A', 'F', 'K', 'P', 'U']
//     const colourCodeB : string[] = ['B', 'G', 'L', 'Q', 'V']
//     const colourCodeC : string[] =['C', 'H', 'M', 'R', 'W']
//     const colourCodeD : string[] = ['D', 'I', 'N', 'S', 'X']
    
//     const getColorForCompany = (companyName: string) => {
//         const initialLetter = companyName.charAt(0).toUpperCase();
        
//         // Define the letter ranges and corresponding color indexes
//         if (colourCodeA.includes(initialLetter)) {
//             indexIntensity = (indexIntensity + 5) % baseColors.length;
//           return baseColors[0]; // Color for A-E
//         } else if (colourCodeB.includes(initialLetter)) {
//           indexIntensity = (indexIntensity + 6) % baseColors.length;
//           return baseColors[1]; // Color for F-J
//         } else if (colourCodeC.includes(initialLetter)) {
//             indexIntensity = (indexIntensity + 7) % baseColors.length;
//           return baseColors[2]; // Color for K-O
//         } else if (colourCodeD.includes(initialLetter)) {
//             indexIntensity = (indexIntensity + 8) % baseColors.length;
//           return baseColors[3]; // Color for P-T
//         } else {
//             indexIntensity = (indexIntensity + 9) % baseColors.length;
//           return baseColors[4]; // Color for U-Z
//         }
//       };
      
//     const selectedColors = getColorForCompany(companyName);
    
//     const varyIntensity = (color: string) => {
//       const intensities = ['100', '200', '300'];
//       const currentIntensity = color.split('-').pop();
//       const newIntensity = intensities[(intensities.indexOf(currentIntensity!) + indexIntensity) % intensities.length];
//       return color.replace(currentIntensity!, newIntensity);
//     };
  
//     const variedColors = selectedColors.map(varyIntensity);
  
//     return `bg-gradient-to-br ${variedColors.join(' ')}`;
//   };
  
//   export default getGradient;
  
  
  
  