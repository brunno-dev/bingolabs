
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { getRandomNumber } from "@/utils/bingoUtils";
import { Play, RotateCcw, X, Volume2, Volume1, VolumeX, Plus, Minus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Definindo caminhos para arquivos de áudio
const rodandoSound = `${import.meta.env.BASE_URL}sound/rodando.MP3`;
const okSound = `${import.meta.env.BASE_URL}sound/ok.MP3`;

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
  id: number;
  number: number;
  letter: string;
  color: string;
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

// Chave para armazenar configuração de volume no localStorage
const VOLUME_KEY = "bingoVolumeLevel";

const BingoWheel = ({ onNumberDrawn, drawnNumbers, isSpinning, setIsSpinning }: BingoWheelProps) => {
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [showExplosion, setShowExplosion] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [drawnBall, setDrawnBall] = useState<number | null>(null);
  const [fallingBall, setFallingBall] = useState(false);
  const [showBigBall, setShowBigBall] = useState(false);
  const [showVolumeControls, setShowVolumeControls] = useState(false);
  
  // Estado para o controle de volume (inicia com 0.5 ou valor salvo)
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const savedVolume = localStorage.getItem(VOLUME_KEY);
      if (savedVolume) {
        try {
          return parseFloat(savedVolume);
        } catch (e) {
          console.error("Erro ao carregar volume do localStorage:", e);
        }
      }
    }
    return 0.5; // Volume padrão (metade)
  });
  
  // Refs para os elementos de áudio
  const spinningAudioRef = useRef<HTMLAudioElement | null>(null);
  const resultAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Ref para o loop de animação
  const animationFrameRef = useRef<number | null>(null);
  
  // Estado para as bolinhas do globo
  const [balls, setBalls] = useState<BingoBall[]>([]);
  
  // Referência para controlar o contador de frames
  const frameCountRef = useRef<number>(0);
  
  // Referência para os dados das bolinhas em movimento (evita re-renders)  
  const ballsDataRef = useRef<BingoBall[]>([]);
  
  // Constantes de física para animação das bolinhas - balanceadas para evitar agrupamento
  const GRAVITY = 0.25; // Valor intermediário para evitar movimentação excessiva em um eixo
  const FRICTION = 0.97; // Fricção para desacelerar gradualmente
  const BOUNCE = 0.75;  // Elasticidade balanceada
  
  // Função para animar as bolinhas dentro do globo - Otimizada
  const animateBalls = useCallback(() => {
    if (!ballsDataRef.current.length) return;
    
    // Atualiza a posição das bolinhas sem acionar re-renders desnecessários
    // Usando o índice para resolver o problema de colisão entre bolinhas
    const updatedBalls = ballsDataRef.current.map((ball, i) => {
      // Criamos uma cópia para manter a imutabilidade durante o cálculo
      const newBall = { ...ball };
      
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
      // Balanceamento entre movimento orbital e físico para evitar agrupamento
      const physicsWeight = 0.6; // Quanto menor, mais o movimento orbital domina
      const orbitalWeight = 1.0 - physicsWeight;
      
      newBall.x = (orbitalX * orbitalWeight) + (newBall.vx * 7 * speedMultiplier * physicsWeight);
      newBall.y = (orbitalY * orbitalWeight) + (newBall.vy * 7 * speedMultiplier * physicsWeight);
      newBall.z = (orbitalZ * orbitalWeight) + (newBall.vz * 7 * speedMultiplier * physicsWeight);
      
      // Aplicar fricção
      newBall.vx *= FRICTION;
      newBall.vy *= FRICTION;
      newBall.vz *= FRICTION;
      
      // Detectar colisões entre bolinhas - usando distância ao quadrado para otimização
      // Só verifica colisões com bolinhas de índice maior para evitar cálculos duplicados
      for (let j = i + 1; j < ballsDataRef.current.length; j++) {
        const otherBall = ballsDataRef.current[j];
        const dx = newBall.x - otherBall.x;
        const dy = newBall.y - otherBall.y;
        const dz = newBall.z - otherBall.z;
        const distanceSquared = dx * dx + dy * dy + dz * dz;
        const minDistance = 38; // Diâmetro aumentado para mais espaço entre bolinhas
        const minDistanceSquared = minDistance * minDistance;
        
        if (distanceSquared < minDistanceSquared) {
          // Adicionar um pequeno fator aleatório para evitar que as bolinhas se agrupem em linha
          const randomFactor = 0.1;
          newBall.vx += (Math.random() - 0.5) * randomFactor;
          newBall.vy += (Math.random() - 0.5) * randomFactor;
          newBall.vz += (Math.random() - 0.5) * randomFactor;
          
          // Calcular normal da superfície - usando distância pré-calculada
          const distanceFromCenter = Math.sqrt(distanceSquared) || 0.001; // Evitar divisão por zero
          const normalX = dx / distanceFromCenter;
          const normalY = dy / distanceFromCenter;
          const normalZ = dz / distanceFromCenter;
          
          // Reposicionar na superfície
          const adjustment = (minDistance - distanceFromCenter) / 2; // Dividir o ajuste entre as duas bolinhas
          newBall.x += normalX * adjustment;
          newBall.y += normalY * adjustment;
          newBall.z += normalZ * adjustment;
          
          // Reflexão da velocidade
          const dotProduct = newBall.vx * normalX + newBall.vy * normalY + newBall.vz * normalZ;
          newBall.vx -= 2 * dotProduct * normalX * BOUNCE;
          newBall.vy -= 2 * dotProduct * normalY * BOUNCE;
          newBall.vz -= 2 * dotProduct * normalZ * BOUNCE;
        }
      }
      
      // Verificar colisão com esfera - otimizado com cálculo de distância ao quadrado
      const dx = newBall.x - GLOBE_CENTER_X;
      const dy = newBall.y - GLOBE_CENTER_Y;
      const dz = newBall.z;
      const distanceSquared = dx*dx + dy*dy + dz*dz;
      const radiusWithBallAdjustment = SPHERE_RADIUS - 18; // 18 é o raio da bolinha
      
      if (distanceSquared > radiusWithBallAdjustment * radiusWithBallAdjustment) {
        // Calcular normal da superfície - usando distância pré-calculada
        const distanceFromCenter = Math.sqrt(distanceSquared);
        const normalX = dx / distanceFromCenter;
        const normalY = dy / distanceFromCenter;
        const normalZ = dz / distanceFromCenter;
        
        // Reposicionar na superfície
        const newDistance = radiusWithBallAdjustment;
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
    
    // Atualiza a referência com os novos dados
    ballsDataRef.current = updatedBalls;
    
    // Atualiza o estado apenas uma vez a cada 3 frames (reduz re-renders)
    frameCountRef.current = (frameCountRef.current || 0) + 1;
    
    if (frameCountRef.current % 3 === 0) {
      setBalls([...updatedBalls]);
    }
  }, [speedMultiplier]);
  
  // Iniciar loop de animação com requestAnimationFrame para melhor performance
  const startAnimation = useCallback(() => {
    let lastTime = 0;
    const targetFPS = 60;
    const frameDelay = 1000 / targetFPS;
    
    const animate = (timestamp: number) => {
      const deltaTime = timestamp - lastTime;
      
      if (deltaTime >= frameDelay) {
        animateBalls();
        lastTime = timestamp;
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [animateBalls]);
  
  // Salvar volume no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, volume.toString());
    
    // Atualizar volume dos áudios existentes
    if (spinningAudioRef.current) {
      spinningAudioRef.current.volume = volume;
    }
    if (resultAudioRef.current) {
      resultAudioRef.current.volume = volume;
    }
  }, [volume]);
  
  // Função para ajustar o volume
  const adjustVolume = (adjustment: number) => {
    setVolume(prevVolume => {
      // Limitar entre 0 e 1
      const newVolume = Math.max(0, Math.min(1, prevVolume + adjustment));
      return Number(newVolume.toFixed(1)); // Arredondar para 1 casa decimal
    });
  };
  
  // Pré-carrega os áudios assim que possível para evitar latência
  useEffect(() => {
    // Inicializa áudio com preload
    const preloadAudio = () => {
      spinningAudioRef.current = new Audio(rodandoSound);
      resultAudioRef.current = new Audio(okSound);
      
      // Prefetch dos áudios para prevenir delay na primeira execução
      spinningAudioRef.current.preload = 'auto';
      resultAudioRef.current.preload = 'auto';
      
      // Configura o áudio da roleta para repetir enquanto estiver girando
      if (spinningAudioRef.current) {
        spinningAudioRef.current.loop = true;
        spinningAudioRef.current.volume = volume;
      }
      
      if (resultAudioRef.current) {
        resultAudioRef.current.volume = volume;
      }
    };
    
    preloadAudio();
    
    return () => {
      if (spinningAudioRef.current) {
        spinningAudioRef.current.pause();
        spinningAudioRef.current = null;
      }
      if (resultAudioRef.current) {
        resultAudioRef.current.pause();
        resultAudioRef.current = null;
      }
    };
  }, []);
  
  // Inicializa as bolinhas e começa a animação em um efeito separado
  useEffect(() => {
    // Inicializa bolinhas de forma otimizada
    initBalls();
    
    // Inicia loop de animação
    startAnimation();
    
    // Limpeza do loop de animação
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [startAnimation]);


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
  
  // Inicializa o globo com bolinhas coloridas
  const initBalls = () => {
    const newBalls: BingoBall[] = [];
    
    // Criar todas as bolinhas com números de 1 a 75
    for (let i = 1; i <= 75; i++) {
      // Pegar letra (B, I, N, G, O) baseada no número
      let letterIndex = 0;
      if (i <= 15) letterIndex = 0; // B: 1-15
      else if (i <= 30) letterIndex = 1; // I: 16-30
      else if (i <= 45) letterIndex = 2; // N: 31-45
      else if (i <= 60) letterIndex = 3; // G: 46-60
      else letterIndex = 4; // O: 61-75
      
      const letter = "BINGO"[letterIndex];
      const color = paletteColors[letterIndex];
      
      newBalls.push({
        id: i,
        number: i,
        letter,
        color,
        x: GLOBE_CENTER_X + Math.random() * 100 - 50,
        y: GLOBE_CENTER_Y + Math.random() * 100 - 50,
        z: Math.random() * 100 - 50,
        vx: (Math.random() - 0.5) * 10, // Velocidade inicial muito maior
        vy: (Math.random() - 0.5) * 10, // Velocidade inicial muito maior
        vz: (Math.random() - 0.5) * 10, // Velocidade inicial muito maior
        orbitalAngle: Math.random() * Math.PI * 2,
        orbitalRadius: 150 + Math.random() * 50,
        // Velocidades orbitais variadas para evitar agrupamento
        orbitalSpeed: (Math.random() * 0.04 + 0.02) * (Math.random() > 0.5 ? 1 : -1), // Menos extremo
        verticalOscillation: Math.random() * Math.PI * 2,
        verticalSpeed: Math.random() * 0.03 + 0.01, // Menos extremo
      });
    }
    
    // Salvar tanto no estado como na referência para evitar re-renders
    setBalls(newBalls);
    ballsDataRef.current = [...newBalls];
  };
  
  // A função animateBalls foi movida para o início do componente
  

  


  const spinWheel = () => {
    if (isSpinning) return;
    
    const availableNumbers = Array.from({length: 75}, (_, i) => i + 1)
      .filter(num => !drawnNumbers.includes(num));
    
    setShowExplosion(false);
    setDrawnBall(null);
    setFallingBall(false);
    setShowBigBall(false);
    
    // Inicializar com velocidade extremamente alta para garantir efeito visível
    setSpeedMultiplier(8.0);
    
    // Inicia o som da roleta girando
    if (spinningAudioRef.current) {
      spinningAudioRef.current.currentTime = 0;
      spinningAudioRef.current.play().catch(error => console.error('Erro ao reproduzir áudio:', error));
    }
    
    // Sorteia um número das bolinhas disponíveis - com timeout significativamente reduzido
    setTimeout(() => {
      const drawnNumber = getRandomNumber(availableNumbers);
      setDrawnBall(drawnNumber);
      
      // Animação de bolinha caindo
      setFallingBall(true);
      
      // Timeout reduzido para animação mais rápida
      setTimeout(() => {
        setFallingBall(false);
        setCurrentNumber(drawnNumber);
        setShowExplosion(true);
        onNumberDrawn(drawnNumber);
        setIsSpinning(false);
        setSpeedMultiplier(3.0); // Mantém uma velocidade muito mais rápida que o normal
        
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
        
        setTimeout(() => setShowExplosion(false), 800);
      }, 800);
    }, 1500);
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
      <div className="flex flex-col items-center gap-4 -mt-6">
        <div className="flex items-center gap-4">
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
          
          {/* Botões de controle de volume */}
          <div className="flex items-center gap-1 bg-white rounded-xl overflow-hidden border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => adjustVolume(-0.1)}
              disabled={volume <= 0}
              className="h-10 px-2 rounded-none border-r hover:bg-gray-100"
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center px-2">
              {volume === 0 ? <VolumeX className="w-5 h-5" /> : 
               volume < 0.5 ? <Volume1 className="w-5 h-5" /> : 
               <Volume2 className="w-5 h-5" />}
              <span className="text-sm font-medium ml-1 w-8">
                {Math.round(volume * 100)}%
              </span>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => adjustVolume(0.1)}
              disabled={volume >= 1}
              className="h-10 px-2 rounded-none border-l hover:bg-gray-100"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
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
