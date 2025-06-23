
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Trophy, Sparkles, Flame } from "lucide-react";
import { useState, useEffect } from "react";

interface DrawnNumbersProps {
  numbers: number[];
  onReset: () => void;
}

const DrawnNumbers = ({ numbers, onReset }: DrawnNumbersProps) => {
  const [animateNumber, setAnimateNumber] = useState<number | null>(null);

  // Efeito para animar o novo número
  useEffect(() => {
    if (numbers.length > 0) {
      setAnimateNumber(numbers[0]);
      const timer = setTimeout(() => {
        setAnimateNumber(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [numbers]);

  // Cores estilo cassino para as bolinhas
  const paletteColors = [
    '#F72585', // Pink neon
    '#7209B7', // Purple
    '#3A0CA3', // Indigo
    '#4361EE', // Blue
    '#4CC9F0', // Cyan
    '#E63946', // Red
    '#F77F00', // Orange
    '#FCBF49'  // Yellow
  ];

  const getNumberColor = (number: number) => {
    return paletteColors[number % paletteColors.length];
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-black/75 backdrop-blur-md border-[#F72585]/50 shadow-2xl overflow-hidden">
        <div className="p-6">
          <div className="relative">
            {/* Faixa decorativa superior estilo cassino */}
            <div className="absolute top-[-20px] left-0 right-0 h-3 bg-gradient-to-r from-[#F72585] via-[#4CC9F0] to-[#FCBF49]"></div>
            
            <div className="flex items-center justify-between mb-6 pt-2">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[#FCBF49]" />
                Números Sorteados
              </h2>
              <div className="flex items-center gap-2">
                <span 
                  className="text-white px-4 py-1 rounded-full text-sm font-bold
                  border border-[#4CC9F0]"
                  style={{
                    background: 'linear-gradient(135deg, #7209B7, #4CC9F0)'
                  }}
                >
                  {numbers.length}/99
                </span>
              </div>
            </div>
          </div>

          {numbers.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-[#4CC9F0]/50 rounded-xl bg-black/50">
              <div className="text-6xl mb-4">🎰 🎱</div>
              <p className="text-[#4CC9F0] text-lg font-semibold">
                Clique em "GIRAR ROLETA" para começar!
              </p>
            </div>
          ) : (
            <>
              {/* Último número sorteado - estilo cassino */}
              <div 
                className="mb-6 p-6 rounded-xl text-center relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #7209B7, #4361EE, #4CC9F0)',
                  boxShadow: '0 0 20px rgba(76, 201, 240, 0.5)'
                }}
              >
                {/* Efeito de brilho estático */}
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.3),_transparent_70%)]"></div>
                
                {/* Marca d'água */}
                <div className="absolute -right-4 -bottom-4 opacity-10 text-9xl font-black">$</div>
                
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold uppercase tracking-wider text-white/80 flex items-center">
                    <Flame className="w-4 h-4 mr-1 text-[#FCBF49]" /> ÚLTIMO SORTEADO
                  </p>
                  
                  <div className="bg-black/30 px-2 py-1 rounded-full text-xs text-[#FCBF49]">
                    HOT
                  </div>
                </div>
                
                <div className="text-7xl font-black text-white drop-shadow-lg my-2"
                     style={{textShadow: '0 0 10px rgba(255, 255, 255, 0.8)'}}>
                  {numbers[0]?.toString().padStart(2, '0')}
                </div>
              </div>

              {/* Lista de números - bolinhas estilo cassino */}
              <div className="max-h-80 overflow-y-auto p-2 bg-black/40 rounded-lg border border-[#4361EE]/30 mb-2">
                <p className="text-xs font-semibold text-[#4CC9F0] mb-2 pl-1">HISTÓRICO DE BOLINHAS</p>
                <div className="grid grid-cols-6 gap-3">
                  {numbers.map((number, index) => (
                    <div
                      key={`${number}-${index}`}
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white
                        ${index === 0 ? 'animate-scale-in' : ''}
                        relative
                      `}
                      style={{
                        backgroundColor: getNumberColor(number),
                        animationDelay: `${index * 0.05}s`,
                        boxShadow: `0 0 10px ${getNumberColor(number)}80, inset 0 0 6px rgba(255, 255, 255, 0.8)`
                      }}
                    >
                      {/* Número */}
                      <span className="z-10 text-base">{number.toString().padStart(2, '0')}</span>
                      
                      {/* Brilho superior */}
                      <div className="absolute top-1 left-3 w-6 h-2 bg-white/40 rounded-full transform rotate-45"></div>
                      
                      {/* Efeito de contorno estático para o número mais recente */}
                      {index === 0 && (
                        <div className="absolute inset-[-3px] rounded-full border-2 border-white"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Botão de reset - estilo cassino */}
              <div className="mt-6 pt-4 border-t border-[#4CC9F0]/30 relative">
                {/* Luzes decorativas estáticas de cassino */}
                <div className="flex justify-center gap-3 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-2 h-2 rounded-full`}
                      style={{
                        backgroundColor: paletteColors[i % paletteColors.length]
                      }}
                    />
                  ))}
                </div>
                
                <Button
                  onClick={onReset}
                  variant="outline"
                  className="w-full border-2 text-white hover:text-white hover:scale-105 transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #F72585, #7209B7)',
                    borderColor: '#4CC9F0',
                    boxShadow: '0 0 15px rgba(76, 201, 240, 0.4)'
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reiniciar Jogo
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DrawnNumbers;
