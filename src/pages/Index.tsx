import BingoWheel from "@/components/BingoWheel";
import DrawnNumbers from "@/components/DrawnNumbers";
import { useState, useEffect } from "react";

// Chave para armazenar os números sorteados no localStorage
const DRAWN_NUMBERS_KEY = "bingoDrawnNumbers";

const Index = () => {
  // Inicializa os números sorteados a partir do localStorage ou array vazio
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>(() => {
    // Tenta recuperar os dados do localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(DRAWN_NUMBERS_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Erro ao carregar números do localStorage:", e);
        }
      }
    }
    return [];
  });
  
  const [isSpinning, setIsSpinning] = useState(false);

  // Salva os números sorteados no localStorage sempre que mudam
  useEffect(() => {
    localStorage.setItem(DRAWN_NUMBERS_KEY, JSON.stringify(drawnNumbers));
  }, [drawnNumbers]);

  const handleNumberDrawn = (number: number) => {
    setDrawnNumbers(prev => [number, ...prev]);
  };

  const resetGame = () => {
    setDrawnNumbers([]);
    // Limpa os números salvos no localStorage
    localStorage.removeItem(DRAWN_NUMBERS_KEY);
  };
  return <div className="min-h-screen p-4" style={{
    backgroundImage: `url(${import.meta.env.BASE_URL}junina.png)`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat"
  }}>
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-white mb-4 animate-fade-in drop-shadow-2xl flex items-center justify-center gap-4" style={{textShadow: "2px 2px 4px rgba(0,0,0,0.8)"}}>
            <img src={`${import.meta.env.BASE_URL}lovable-uploads/a1e796c4-758a-4d86-84ca-7485bc4cd096.png`} alt="$$ DE MILHÕES" className="w-16 h-16 object-contain" />
            BingoLabs
            <img src={`${import.meta.env.BASE_URL}lovable-uploads/a1e796c4-758a-4d86-84ca-7485bc4cd096.png`} alt="$$ DE MILHÕES" className="w-16 h-16 object-contain" />
          </h1>
          
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Roleta */}
          <div className="lg:col-span-2 flex justify-center">
            <BingoWheel onNumberDrawn={handleNumberDrawn} drawnNumbers={drawnNumbers} isSpinning={isSpinning} setIsSpinning={setIsSpinning} />
          </div>
          
          {/* Números sorteados */}
          <div className="lg:col-span-1">
            <DrawnNumbers numbers={drawnNumbers} onReset={resetGame} />
          </div>
        </div>
      </div>
    </div>;
};
export default Index;