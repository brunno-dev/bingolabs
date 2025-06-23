
export const getRandomNumber = (availableNumbers: number[]): number => {
  const randomIndex = Math.floor(Math.random() * availableNumbers.length);
  return availableNumbers[randomIndex];
};

export const generateBingoNumbers = (): number[] => {
  return Array.from({ length: 99 }, (_, i) => i + 1);
};

export const formatNumber = (num: number): string => {
  return num.toString().padStart(2, '0');
};
