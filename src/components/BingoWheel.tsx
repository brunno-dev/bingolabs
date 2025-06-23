
import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { getRandomNumber } from "@/utils/bingoUtils";
import { Play, RotateCcw, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Definindo caminhos para arquivos de áudio
const rodandoSound = "/sound/rodando.MP3";
const okSound = "/sound/ok.MP3";

// Constantes para o globo 3D
const GLOBE_CENTER_X = 200;
const GLOBE_CENTER_Y = 200;
const SPHERE_RADIUS = 185;

interface BingoWheelProps {
  onNumberDrawn: (number: number) => void;
  drawnNumbers: number[];
  isSpinning: boolean;
  setIsSpinning: (spinning: boolean) => void;
}

// Interface para representar as bolinhas no globo
interface BingoBall {
  number: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  orbitalAngle: number;
  orbitalSpeed: number;
  orbitalRadius: number;
  verticalOscillation: number;
  verticalSpeed: number;
}

const BingoWheel = ({ onNumberDrawn, drawnNumbers, isSpinning, setIsSpinning }: BingoWheelProps) => {
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [showExplosion, setShowExplosion] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [drawnBall, setDrawnBall] = useState<number | null>(null);
  const [fallingBall, setFallingBall] = useState(false);
  const [showBigBall, setShowBigBall] = useState(false);
  
  // Refs para os elementos de áudio
  const spinningAudioRef = useRef<HTMLAudioElement | null>(null);
  const resultAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Ref para o loop de animação
  const animationFrameRef = useRef<number | null>(null);
  
  // Estado para as bolinhas do globo
  const [balls, setBalls] = useState<BingoBall[]>([]);
  
  // Inicializa os elementos de áudio e as bolinhas ao montar o componente
  useEffect(() => {
    // Inicializa áudio
    spinningAudioRef.current = new Audio(rodandoSound);
    resultAudioRef.current = new Audio(okSound);
    
    // Configura o áudio da roleta para repetir enquanto estiver girando
    if (spinningAudioRef.current) {
      spinningAudioRef.current.loop = true;
    }
    
    // Inicializa bolinhas
    initBalls();
    
    // Inicia loop de animação
    startAnimation();
    
    // Limpeza ao desmontar o componente
    return () => {
      if (spinningAudioRef.current) {
        spinningAudioRef.current.pause();
        spinningAudioRef.current = null;
      }
      if (resultAudioRef.current) {
        resultAudioRef.current.pause();
        resultAudioRef.current = null;
      }
      
      // Cancelar loop de animação
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Cores da paleta SEM VERDE
  const paletteColors = [
    '#D7294E', // Magenta
    '#F28526', // Orange
    '#A63B04', // Dark Orange
    '#F2C500', // Yellow
    '#CC8500', // Dark Yellow
    '#6738FF', // Blue
    '#091933'  // Dark Blue
  ];

  const getNumberColor = (number: number) => {
    return paletteColors[number % paletteColors.length];
  };
  
  // Inicializa as bolinhas do globo 3D
  const initBalls = () => {
    const newBalls: BingoBall[] = [];
    
    // Criar 75 bolinhas numeradas de 1 a 75
    for (let i = 1; i <= 75; i++) {
      // Posição inicial aleatória com distribuição esférica
      const orbitalAngle = Math.random() * Math.PI * 2;
      const orbitalRadius = Math.random() * 120 + 60;
      
      // Velocidade inicial
      const vx = (Math.random() - 0.5) * 4;
      const vy = (Math.random() - 0.5) * 4;
      const vz = (Math.random() - 0.5) * 4;
      
      // Movimento orbital independente
      const verticalOscillation = Math.random() * Math.PI * 2;
      const verticalSpeed = (Math.random() + 0.5) * 0.03;
      const orbitalSpeed = (Math.random() + 0.5) * 0.02;
      
      // Calcular posição orbital inicial
      const x = GLOBE_CENTER_X + Math.cos(orbitalAngle) * orbitalRadius;
      const z = Math.sin(orbitalAngle) * orbitalRadius;
      const y = GLOBE_CENTER_Y + Math.sin(verticalOscillation) * 80;
      
      newBalls.push({
        number: i,
        x, y, z,
        vx, vy, vz,
        orbitalAngle,
        orbitalSpeed,
        orbitalRadius,
        verticalOscillation,
        verticalSpeed
      });
    }
    
    setBalls(newBalls);
  };
  
  // Constantes de física para animação das bolinhas
  const GRAVITY = 0.2;
  const FRICTION = 0.98;
  const BOUNCE = 0.7;
  
  // Função para animar as bolinhas dentro do globo
  const animateBalls = () => {
    setBalls(prevBalls => {
      return prevBalls.map(ball => {
        // Copia para não mutar o objeto original
        const newBall = {...ball};
        
        // Movimento orbital independente (com multiplicador de velocidade)
        newBall.orbitalAngle += newBall.orbitalSpeed * speedMultiplier;
        newBall.verticalOscillation += newBall.verticalSpeed * speedMultiplier;
        
        // Calcular posição orbital
        const orbitalX = GLOBE_CENTER_X + Math.cos(newBall.orbitalAngle) * newBall.orbitalRadius;
        const orbitalZ = Math.sin(newBall.orbitalAngle) * newBall.orbitalRadius;
        const orbitalY = GLOBE_CENTER_Y + Math.sin(newBall.verticalOscillation) * 80;
        
        // Aplicar física também (com multiplicador)
        newBall.vy += GRAVITY * speedMultiplier;
        
        // Misturar movimento orbital com física
        newBall.x = orbitalX + newBall.vx * 5 * speedMultiplier;
        newBall.y = orbitalY + newBall.vy * 5 * speedMultiplier;
        newBall.z = orbitalZ + newBall.vz * 5 * speedMultiplier;
        
        // Aplicar fricção
        newBall.vx *= FRICTION;
        newBall.vy *= FRICTION;
        newBall.vz *= FRICTION;
        
        // Verificar colisão com esfera (paredes do globo)
        const distanceFromCenter = Math.sqrt(
          Math.pow(newBall.x - GLOBE_CENTER_X, 2) + 
          Math.pow(newBall.y - GLOBE_CENTER_Y, 2) + 
          Math.pow(newBall.z, 2)
        );
        
        if (distanceFromCenter > SPHERE_RADIUS - 18) { // 18 é o raio da bolinha
          // Calcular normal da superfície
          const normalX = (newBall.x - GLOBE_CENTER_X) / distanceFromCenter;
          const normalY = (newBall.y - GLOBE_CENTER_Y) / distanceFromCenter;
          const normalZ = newBall.z / distanceFromCenter;
          
          // Reposicionar na superfície
          const newDistance = SPHERE_RADIUS - 18;
          newBall.x = GLOBE_CENTER_X + normalX * newDistance;
          newBall.y = GLOBE_CENTER_Y + normalY * newDistance;
          newBall.z = normalZ * newDistance;
          
          // Reflexão da velocidade
          const dotProduct = newBall.vx * normalX + newBall.vy * normalY + newBall.vz * normalZ;
          newBall.vx -= 2 * dotProduct * normalX * BOUNCE;
          newBall.vy -= 2 * dotProduct * normalY * BOUNCE;
          newBall.vz -= 2 * dotProduct * normalZ * BOUNCE;
          
          // Mudar direção orbital ao bater na parede
          newBall.orbitalSpeed *= -0.8;
        }
        
        return newBall;
      });
    });
  };
  
  // Iniciar loop de animação
  const startAnimation = () => {
    const animate = () => {
      animateBalls();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  };

  const spinWheel = () => {
    if (isSpinning) return;
    
    const availableNumbers = Array.from({length: 75}, (_, i) => i + 1)
      .filter(num => !drawnNumbers.includes(num));
    
    if (availableNumbers.length === 0) {
      toast({
        title: "Jogo Finalizado!",
        description: "Todos os números já foram sorteados!",
        variant: "default",
      });
      return;
    }

    setIsSpinning(true);
    setCurrentNumber(null);
    setFallingBall(false);
    setShowExplosion(false);
    setShowBigBall(false);
    setSpeedMultiplier(2.5); // Aumenta a velocidade de rotação do globo
    
    // Inicia o som da roleta girando
    if (spinningAudioRef.current) {
      spinningAudioRef.current.currentTime = 0;
      spinningAudioRef.current.play().catch(error => console.error('Erro ao reproduzir áudio:', error));
    }
    
    // Sorteia um número das bolinhas disponíveis
    setTimeout(() => {
      const drawnNumber = getRandomNumber(availableNumbers);
      setDrawnBall(drawnNumber);
      
      // Animação de bolinha caindo
      setFallingBall(true);
      
      setTimeout(() => {
        setFallingBall(false);
        setCurrentNumber(drawnNumber);
        setShowExplosion(true);
        onNumberDrawn(drawnNumber);
        setIsSpinning(false);
        setSpeedMultiplier(1); // Retorna à velocidade normal
        
        // Para o som da roleta girando
        if (spinningAudioRef.current) {
          spinningAudioRef.current.pause();
          spinningAudioRef.current.currentTime = 0;
        }
        
        // Toca o som de confirmação
        if (resultAudioRef.current) {
          resultAudioRef.current.currentTime = 0;
          resultAudioRef.current.play().catch(error => console.error('Erro ao reproduzir áudio:', error));
        }
        
        // Mostra a bola grande no meio da tela após uma pequena pausa
        setTimeout(() => {
          setShowBigBall(true);
        }, 500);
        
        setTimeout(() => setShowExplosion(false), 1500);
      }, 1000);
    }, 3000);
  };

  // Função para fechar o modal da bola grande
  const closeBigBall = () => {
    setShowBigBall(false);
  };

  return (
    <div className="flex flex-col items-center space-y-8 relative">
      {/* Globo 3D */}
      <div className="relative mt-10 mb-12">
        <div className={`globe-container ${isSpinning ? 'spinning' : ''}`}>
          {/* Anéis estruturais principais */}
          <div className="ring ring-equator"></div>
          <div className="ring ring-meridian"></div>
          
          {/* Anéis de latitude (paralelos) */}
          <div className="ring ring-lat-1"></div>
          <div className="ring ring-lat-2"></div>
          <div className="ring ring-lat-3"></div>
          <div className="ring ring-lat-4"></div>
          <div className="ring ring-lat-5"></div>
          <div className="ring ring-lat-6"></div>
          
          {/* Anéis meridianos (longitude) */}
          <div className="ring ring-meridian-1"></div>
          <div className="ring ring-meridian-2"></div>
          <div className="ring ring-meridian-3"></div>
          <div className="ring ring-meridian-4"></div>
          
          {/* Anéis diagonais */}
          <div className="ring ring-diag-1"></div>
          <div className="ring ring-diag-2"></div>
          <div className="ring ring-diag-3"></div>
          <div className="ring ring-diag-4"></div>
          
          {/* Bolinhas dentro do globo */}
          {balls.map((ball, index) => {
            // A profundidade é simulada pela escala e z-index
            const depthScale = Math.max(0.7, Math.min(1.2, (ball.z + 250) / 400));
            const zIndex = Math.round(ball.z + 300);
            
            return (
              <div
                key={`ball-${ball.number}`}
                className="bingo-ball"
                style={{
                  left: `${ball.x - 18}px`, // 18 é o raio da bolinha (36px/2)
                  top: `${ball.y - 18}px`,
                  backgroundColor: getNumberColor(ball.number),
                  transform: `scale(${depthScale})`,
                  zIndex: zIndex,
                  // Destaque para a bolinha sorteada
                  boxShadow: drawnBall === ball.number ? 
                    '0 0 20px 5px rgba(255,255,255,0.8), inset -6px -6px 12px rgba(0,0,0,0.3), inset 6px 6px 12px rgba(255,255,255,0.4)' : 
                    '0 8px 20px rgba(0,0,0,0.6), inset -6px -6px 12px rgba(0,0,0,0.3), inset 6px 6px 12px rgba(255,255,255,0.4)'
                }}
              >
                {ball.number.toString().padStart(2, '0')}
              </div>
            );
          })}
        </div>

        {/* Dispositivo de saída/tubo */}
        <div className="flex justify-center items-center flex-col mt-2">
          {/* Tubo de saída */}
          <div className="w-10 h-16 bg-gradient-to-b from-gray-400 to-gray-600 rounded-b-lg shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20"></div>
          </div>
          
          {/* Base do dispositivo */}
          <div className="w-16 h-6 bg-gradient-to-r from-gray-500 to-gray-700 rounded-full shadow-lg"></div>
          
          {/* Bandeja coletora */}
          <div className="w-24 h-4 bg-gradient-to-r from-gray-600 to-gray-800 rounded-full shadow-inner mt-1"></div>
        </div>
      </div>

      {/* Bolinha caindo */}
      {fallingBall && drawnBall && (
        <div 
          className="absolute w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg z-50"
          style={{
            backgroundColor: getNumberColor(drawnBall),
            top: '420px',
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'fall-down 1s ease-in-out forwards',
            boxShadow: '0 0 20px 5px rgba(255,255,255,0.5), inset -6px -6px 12px rgba(0,0,0,0.3), inset 6px 6px 12px rgba(255,255,255,0.4)'
          }}
        >
          {drawnBall.toString().padStart(2, '0')}
        </div>
      )}
      
      {/* Controles - Movido para cima */}
      <div className="flex gap-4 -mt-6">
        <Button
          onClick={spinWheel}
          disabled={isSpinning}
          size="lg"
          className={`text-white px-8 py-4 text-xl font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 ${!isSpinning ? 'animate-pulse-slow' : ''}`}
          style={{
            background: 'linear-gradient(135deg, #F28526, #D7294E)',
            border: 'none'
          }}
        >
          <Play className="w-6 h-6 mr-2" />
          {isSpinning ? 'GIRANDO...' : 'GIRAR ROLETA'}
        </Button>
      </div>

      {/* Número atual sorteado com efeito de explosão */}
      {currentNumber && (
        <div 
          className={`bingo-gradient-reverse text-white rounded-xl p-6 shadow-2xl relative mt-6 ${showExplosion ? 'animate-explosion' : 'animate-scale-in'}`}
          style={{
            background: 'linear-gradient(135deg, #F2C500, #F28526, #D7294E)'
          }}
        >
          {/* Partículas de explosão */}
          {showExplosion && (
            <div className="absolute inset-0">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-particle"
                  style={{
                    backgroundColor: paletteColors[i % paletteColors.length],
                    top: '50%',
                    left: '50%',
                    transform: `rotate(${i * 51}deg) translateX(50px)`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          )}
          
          <div className="text-center relative z-10">
            <p className="text-lg font-semibold mb-2">NÚMERO SORTEADO</p>
            <div className="text-6xl font-bold">
              {currentNumber.toString().padStart(2, '0')}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal da bola grande no centro da tela */}
      {showBigBall && currentNumber && (
        <div 
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50"
          onClick={closeBigBall}
        >
          <div 
            className="relative w-64 h-64 rounded-full flex items-center justify-center text-5xl font-bold text-white animate-scale-in"
            style={{
              backgroundColor: getNumberColor(currentNumber),
              boxShadow: '0 0 40px 10px rgba(255,255,255,0.5), inset -12px -12px 24px rgba(0,0,0,0.3), inset 12px 12px 24px rgba(255,255,255,0.4)'
            }}
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                closeBigBall();
              }}
              className="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-70 transition-all"
            >
              <X size={16} />
            </button>
            {currentNumber.toString().padStart(2, '0')}
          </div>
        </div>
      )}
    </div>
  );
};

export default BingoWheel;
