
import React, { useState, useEffect, useRef } from 'react';
import { Screen, WineData, UserProfile, GuideItem, CellarPreferences } from './types';
import { analyzeWineLabel } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { 
  Camera, 
  History, 
  Heart, 
  User, 
  Home as HomeIcon, 
  ChevronLeft, 
  Wine, 
  Scan, 
  Star, 
  Zap,
  LogOut,
  ChevronRight,
  Image as ImageIcon,
  CheckCircle2,
  X,
  RefreshCcw,
  Check,
  Lock,
  Loader2,
  AlertCircle,
  MapPin,
  Calendar,
  Utensils,
  BookOpen,
  ArrowUpRight,
  Sparkles,
  Mail,
  Smartphone,
  Globe,
  Quote,
  Settings,
  Coins,
  Tags,
  Lightbulb,
  ExternalLink,
  TrendingUp,
  Grape,
  Sun,
  Moon
} from 'lucide-react';

// --- Static Data ---
const GUIDES: GuideItem[] = [
  {
    id: "safra-importancia",
    type: "Insight Premium",
    title: "Por que a safra muda tudo no vinho?",
    icon: "calendar",
    image: "https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?auto=format&fit=crop&q=80&w=800",
    content: `A safra influencia diretamente o sabor, a acidez e o potencial de envelhecimento de um vinho. Clima, chuvas e temperatura de cada ano transformam completamente o resultado final da garrafa.`
  },
  {
    id: "pontuacao-vinhos",
    type: "Educação",
    title: "Pontuação de vinhos: como funciona?",
    icon: "star",
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800",
    content: `Entenda como críticos, concursos e plataformas avaliam vinhos e o que significa uma nota 90+.`
  }
];

const POPULAR_GRAPES = ["Cabernet Sauvignon", "Merlot", "Pinot Noir", "Syrah", "Chardonnay", "Sauvignon Blanc", "Malbec", "Tempranillo", "Sangiovese", "Nebbiolo"];
const POPULAR_REGIONS = ["Bordeaux", "Toscana", "Napa Valley", "Mendoza", "Rioja", "Douro", "Champagne", "Piedmont", "Alentejo"];

// --- Navbar ---
const Navbar = ({ current, onNavigate }: { current: Screen, onNavigate: (s: Screen) => void }) => {
  const tabs = [
    { id: Screen.HOME, icon: HomeIcon, label: 'Início' },
    { id: Screen.HISTORY, icon: History, label: 'Histórico' },
    { id: Screen.FAVORITES, icon: Heart, label: 'Adega' },
    { id: Screen.PROFILE, icon: User, label: 'Conta' },
  ];

  return (
    <div className="fixed bottom-6 left-6 right-6 h-20 glass rounded-[2.5rem] flex justify-around items-center z-50 px-2 shadow-2xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onNavigate(tab.id)}
          className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${current === tab.id ? 'text-burgundy translate-y-[-4px]' : 'opacity-40'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${current === tab.id ? 'bg-burgundy text-white shadow-lg shadow-burgundy/40' : ''}`}>
            <tab.icon size={20} strokeWidth={current === tab.id ? 2.5 : 2} />
          </div>
          <span className={`text-[8px] uppercase tracking-[0.2em] font-bold ${current === tab.id ? 'text-burgundy' : 'text-current'}`}>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export default function App() {
  const [screen, setScreen] = useState<Screen>(Screen.SPLASH);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<WineData[]>([]);
  const [currentWine, setCurrentWine] = useState<WineData | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<GuideItem | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("Iniciando...");
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Aplica o tema ao body
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [theme]);

  useEffect(() => {
    let mounted = true;

    const watchdog = setTimeout(() => {
      if (mounted && isAuthChecking) {
        setIsAuthChecking(false);
        setScreen(Screen.LOGIN);
      }
    }, 8000);

    const handleSession = async (session: any) => {
      if (!mounted) return;
      
      if (session?.user) {
        await fetchUserProfile(session.user.id, session.user.email!);
        if (mounted) {
          setIsAuthChecking(false);
          setScreen(Screen.HOME);
        }
      } else {
        if (mounted) {
          setIsAuthChecking(false);
          setScreen(Screen.LOGIN);
          setUser(null);
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      handleSession(session);
    });

    return () => {
      mounted = false;
      clearTimeout(watchdog);
      subscription?.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string, email: string) => {
    try {
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      
      let finalProfile = profile;
      if (error || !profile) {
        const { data: newProfile, error: insertError } = await supabase.from('profiles')
          .insert([{ id: userId, email, name: email.split('@')[0], scan_count: 0, favorites: [], preferences: { preferredTypes: [], favoriteGrapes: [], preferredRegions: [], priceRange: 'Standard' } }])
          .select().single();
        if (!insertError) finalProfile = newProfile;
      }

      const userData: UserProfile = {
        name: finalProfile?.name || email.split('@')[0],
        email: finalProfile?.email || email,
        isPro: finalProfile?.is_pro || false,
        scanCount: finalProfile?.scan_count || 0,
        scanLimit: 4,
        favorites: finalProfile?.favorites || [],
        preferences: finalProfile?.preferences || { preferredTypes: [], favoriteGrapes: [], preferredRegions: [], priceRange: 'Standard' }
      };

      setUser(userData);

      const { data: scans } = await supabase.from('scans').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (scans) setHistory(scans.map((s: any) => ({ ...s.wine_data, id: s.id })));
      
      return true;
    } catch (e) {
      console.error("Erro fatal no perfil:", e);
      setUser({
        name: email.split('@')[0],
        email: email,
        isPro: false,
        scanCount: 0,
        scanLimit: 4,
        favorites: []
      });
      return true;
    }
  };

  const savePreferences = async (newPrefs: CellarPreferences) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { error } = await supabase.from('profiles').update({ preferences: newPrefs }).eq('id', session.user.id);
        if (error) throw error;
        setUser({ ...user, preferences: newPrefs });
        setScreen(Screen.PROFILE);
      }
    } catch (e) {
      alert("Erro ao salvar preferências.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (email: string, pass: string, isSignUp: boolean) => {
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password: pass });
        if (error) throw error;
        alert("Verifique seu e-mail para confirmar a conta.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      }
    } catch (e: any) {
      alert(e.message || "Credenciais inválidas.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (wineId: string) => {
    if (!user) return;
    
    const isFav = user.favorites.includes(wineId);
    const newFavs = isFav 
      ? user.favorites.filter(id => id !== wineId)
      : [...user.favorites, wineId];
      
    setUser({ ...user, favorites: newFavs });

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('profiles').update({ favorites: newFavs }).eq('id', session.user.id);
    }
  };

  const processImage = async (base64: string) => {
    setScreen(Screen.LOADING);
    setLoadingMsg("Vision AI está buscando preços em tempo real...");
    try {
      const result = await analyzeWineLabel(base64);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await supabase.from('scans').insert([{ user_id: session.user.id, wine_data: result }]);
        setHistory(prev => [result, ...prev]);
        
        const newCount = (user?.scanCount || 0) + 1;
        await supabase.from('profiles').update({ scan_count: newCount }).eq('id', session.user.id);
        if (user) setUser({ ...user, scanCount: newCount });
      }
      
      setCurrentWine(result);
      setScreen(Screen.RESULT);
    } catch (error: any) {
      alert("Erro na análise. Tente uma foto mais próxima e iluminada.");
      setScreen(Screen.HOME);
    }
  };

  const renderScreen = () => {
    if (isAuthChecking) return <SplashScreen />;

    switch (screen) {
      case Screen.SPLASH: return <SplashScreen />;
      case Screen.LOGIN: return <LoginScreen onAuth={handleAuth} loading={loading} />;
      case Screen.HOME: 
        return user ? (
          <HomeScreen user={user} onScan={() => setScreen(Screen.CAMERA)} onUpload={() => uploadInputRef.current?.click()} onNavigate={setScreen} onOpenGuide={g => { setSelectedGuide(g); setScreen(Screen.GUIDE_DETAIL); }} />
        ) : (
          <SplashScreen />
        );
      case Screen.CAMERA: return <CameraScreen onCapture={processImage} onCancel={() => setScreen(Screen.HOME)} onUpload={() => uploadInputRef.current?.click()} />;
      case Screen.LOADING: return <LoadingScreen message={loadingMsg} />;
      case Screen.RESULT: return currentWine && <ResultScreen wine={currentWine} isFavorite={user?.favorites.includes(currentWine.id) || false} onToggleFavorite={() => toggleFavorite(currentWine.id)} onBack={() => setScreen(Screen.HOME)} />;
      case Screen.HISTORY: return <HistoryScreen history={history} onSelect={w => { setCurrentWine(w); setScreen(Screen.RESULT); }} />;
      case Screen.FAVORITES: return <FavoritesScreen favorites={history.filter(w => user?.favorites.includes(w.id))} onSelect={w => { setCurrentWine(w); setScreen(Screen.RESULT); }} />;
      case Screen.PROFILE: return user && <ProfileScreen user={user} theme={theme} onThemeToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')} onLogout={() => supabase.auth.signOut()} onNavigate={setScreen} />;
      case Screen.GUIDE_DETAIL: return selectedGuide && <GuideDetailScreen guide={selectedGuide} onBack={() => setScreen(Screen.HOME)} />;
      case Screen.CELLAR_PREFERENCES: return user && <CellarPreferencesScreen currentPrefs={user.preferences!} onSave={savePreferences} onCancel={() => setScreen(Screen.PROFILE)} loading={loading} />;
      default: return <LoginScreen onAuth={handleAuth} loading={loading} />;
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-burgundy/30">
      <input type="file" ref={uploadInputRef} className="hidden" accept="image/jpeg,image/png" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => processImage((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        }
      }} />
      {renderScreen()}
      {[Screen.HOME, Screen.HISTORY, Screen.FAVORITES, Screen.PROFILE].includes(screen) && <Navbar current={screen} onNavigate={setScreen} />}
    </div>
  );
}

// --- Componentes ---

const SplashScreen = () => (
  <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
    <div className="relative">
      <div className="w-24 h-24 bg-burgundy rounded-3xl flex items-center justify-center animate-pulse shadow-[0_0_60px_rgba(92,10,10,0.5)]">
        <Wine className="text-white" size={48} />
      </div>
      <div className="absolute -inset-4 bg-burgundy/20 blur-2xl rounded-full" />
    </div>
    <h1 className="serif text-4xl font-bold mt-10 tracking-tighter text-white/90">VinoScan</h1>
    <p className="text-white/20 text-[10px] uppercase font-black tracking-[0.5em] mt-4">Sommelier Inteligente</p>
  </div>
);

const LoadingScreen = ({ message }: { message: string }) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-10">
    <div className="w-16 h-16 border-2 border-burgundy/5 border-t-burgundy rounded-full animate-spin mb-8" />
    <p className="opacity-40 text-[10px] uppercase font-black tracking-widest text-center max-w-[200px] leading-relaxed">{message}</p>
  </div>
);

const LoginScreen = ({ onAuth, loading }: any) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="min-h-screen flex flex-col px-10 pt-24 animate-in fade-in duration-500">
      <Wine className="text-burgundy mb-8" size={44} />
      <h1 className="serif text-4xl font-bold mb-4">{isSignUp ? 'Descubra a Excelência.' : 'Sua Adega Digital.'}</h1>
      <p className="opacity-40 text-xs mb-10 leading-relaxed">Acesse o sommelier AI mais avançado do mundo.</p>
      
      <div className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20" size={18} />
          <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="w-full h-16 glass rounded-2xl pl-14 pr-6 outline-none focus:border-burgundy/50 transition-all text-sm" />
        </div>
        <div className="relative">
          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20" size={18} />
          <input type="password" placeholder="Senha" value={pass} onChange={e => setPass(e.target.value)} className="w-full h-16 glass rounded-2xl pl-14 pr-6 outline-none focus:border-burgundy/50 transition-all text-sm" />
        </div>
        
        <button onClick={() => onAuth(email, pass, isSignUp)} disabled={loading} className="w-full h-16 bg-burgundy text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-burgundy/20 active:scale-95 transition-all">
          {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'Criar Acesso' : 'Entrar na Adega')}
        </button>
        
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full py-6 opacity-40 text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-100 transition-colors">
          {isSignUp ? 'Já possui conta? Acessar' : 'Novo por aqui? Começar agora'}
        </button>
      </div>
    </div>
  );
};

const HomeScreen = ({ user, onScan, onUpload, onOpenGuide }: any) => (
  <div className="min-h-screen pb-32 pt-20 px-8 animate-in slide-in-from-bottom duration-700">
    <header className="mb-12 flex justify-between items-start">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">Membro Platinum</p>
        <h2 className="serif text-3xl font-bold">Olá, {user.name}</h2>
      </div>
      <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center">
        <Sparkles size={20} className="text-gold" />
      </div>
    </header>

    <div className="bg-burgundy text-white rounded-[2.5rem] p-10 mb-12 shadow-2xl shadow-burgundy/30 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
        <Scan size={120} />
      </div>
      <h3 className="serif text-3xl font-bold mb-4">Escanear Rótulo</h3>
      <p className="text-white/60 text-sm mb-10 leading-relaxed max-w-[200px]">Identifique instantaneamente vinhos e terroirs raros.</p>
      <div className="flex gap-3">
        <button onClick={onScan} className="flex-1 bg-white text-black h-14 rounded-2xl flex items-center justify-center font-bold text-[10px] uppercase tracking-widest gap-3 active:scale-95 transition-all shadow-xl">
          <Camera size={18} /> Câmera
        </button>
        <button onClick={onUpload} className="w-14 h-14 glass text-white rounded-2xl flex items-center justify-center active:scale-95 transition-all border-white/20">
          <ImageIcon size={20} />
        </button>
      </div>
    </div>

    <div className="flex justify-between items-center mb-6 px-2">
      <h4 className="serif text-2xl font-bold">Guia do Sommelier</h4>
      <BookOpen className="opacity-20" size={20} />
    </div>

    <div className="space-y-4">
      {GUIDES.map(g => (
        <div key={g.id} onClick={() => onOpenGuide(g)} className="glass rounded-[2rem] overflow-hidden flex flex-col active:scale-[0.98] transition-all group">
          <div className="h-36 relative">
            <img src={g.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute top-4 left-5 bg-burgundy/80 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/10 text-white">
              {g.type}
            </div>
          </div>
          <div className="p-6 flex flex-col">
            <h5 className="font-bold mb-4 leading-tight group-hover:text-gold transition-colors">{g.title}</h5>
            <div className="w-full bg-current bg-opacity-[0.05] rounded-xl py-3 px-4 flex items-center justify-between group-hover:bg-burgundy group-hover:text-white transition-all duration-300">
              <span className="text-[10px] font-black uppercase tracking-widest">Ver guia completo</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ResultScreen = ({ wine, isFavorite, onToggleFavorite, onBack }: any) => (
  <div className="min-h-screen pb-32 animate-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar">
    <div className="h-[28rem] relative">
      <img src={wine.image} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
      
      <div className="absolute top-14 left-8 right-8 flex justify-between items-center">
        <button onClick={onBack} className="w-12 h-12 glass text-white rounded-2xl flex items-center justify-center border border-white/10 active:scale-90 transition-all">
          <ChevronLeft />
        </button>
        <button onClick={onToggleFavorite} className={`w-12 h-12 glass rounded-2xl flex items-center justify-center border border-white/10 active:scale-90 transition-all ${isFavorite ? 'text-burgundy' : 'text-white'}`}>
          <Heart fill={isFavorite ? "currentColor" : "none"} size={22} />
        </button>
      </div>
    </div>
    
    <div className="px-10 -mt-16 relative z-10">
      <div className="mb-10">
        <h1 className="serif text-5xl font-bold mb-2 leading-tight drop-shadow-sm">{wine.name}</h1>
        <p className="text-gold font-black text-[11px] uppercase tracking-[0.3em]">{wine.producer}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="glass p-8 rounded-[2rem] shadow-xl">
          <p className="text-[10px] opacity-30 uppercase font-black tracking-widest mb-2">Nota Sommelier</p>
          <div className="flex items-baseline gap-1">
            <p className="text-5xl font-black tracking-tighter">{wine.score}</p>
            <span className="text-xs opacity-30 font-bold">/100</span>
          </div>
        </div>
        <div className="glass p-8 rounded-[2rem] shadow-xl">
          <p className="text-[10px] opacity-30 uppercase font-black tracking-widest mb-2">Ano da Safra</p>
          <p className="text-5xl font-black tracking-tighter">{wine.vintage}</p>
        </div>
      </div>

      <div className="space-y-10">
        <div className="glass p-10 rounded-[2.5rem] relative overflow-hidden bg-gradient-to-br from-gold/10 to-transparent">
          <div className="absolute -right-4 -top-4 text-gold/10 rotate-12">
             <TrendingUp size={100} />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h5 className="text-[10px] text-gold uppercase font-black tracking-widest">Preço em Tempo Real</h5>
          </div>
          <p className="text-3xl font-black mb-4">{wine.estimatedPrice}</p>
          
          {wine.searchSources && wine.searchSources.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-current border-opacity-5">
              <p className="text-[8px] opacity-40 uppercase font-bold tracking-widest">Fontes de Mercado:</p>
              {wine.searchSources.slice(0, 2).map((src: any, i: number) => (
                <a key={i} href={src.uri} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-[10px] opacity-60 hover:opacity-100 transition-colors">
                  <span className="truncate pr-4">{src.title}</span>
                  <ExternalLink size={10} />
                </a>
              ))}
            </div>
          )}
        </div>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <Quote className="text-burgundy" size={16} fill="currentColor" />
            <h5 className="text-[10px] opacity-30 uppercase font-black tracking-[0.2em]">Notas de Degustação</h5>
          </div>
          <p className="opacity-70 leading-relaxed italic text-lg serif">"{wine.about}"</p>
        </section>

        <div className="glass p-10 rounded-[2.5rem] relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 text-burgundy/10">
             <Utensils size={100} />
          </div>
          <h5 className="text-[10px] text-gold uppercase font-black mb-4 tracking-widest">A Harmonização Perfeita</h5>
          <p className="text-md font-medium leading-relaxed relative z-10 opacity-90">{wine.pairing}</p>
        </div>
      </div>
    </div>
  </div>
);

const HistoryScreen = ({ history, onSelect }: any) => (
  <div className="min-h-screen pt-24 px-10 pb-36 overflow-y-auto no-scrollbar animate-in fade-in duration-700">
    <div className="flex justify-between items-end mb-12">
      <h2 className="serif text-4xl font-bold">Sua Adega</h2>
      <div className="w-10 h-10 glass rounded-xl flex items-center justify-center">
        <History size={18} className="opacity-20" />
      </div>
    </div>
    <div className="space-y-6">
      {history.map((w: any) => (
        <div key={w.id} onClick={() => onSelect(w)} className="glass p-5 rounded-[2.25rem] flex gap-5 items-center active:scale-95 transition-all shadow-xl">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-current bg-opacity-[0.05]">
            <img src={w.image} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm truncate opacity-90">{w.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-black opacity-30 uppercase tracking-widest">{w.vintage}</span>
              <div className="w-1 h-1 bg-current opacity-10 rounded-full" />
              <span className="text-[9px] font-bold text-gold uppercase tracking-widest">{w.score} pts</span>
            </div>
          </div>
          <ChevronRight className="opacity-10" size={18} />
        </div>
      ))}
    </div>
  </div>
);

const FavoritesScreen = ({ favorites, onSelect }: any) => (
  <div className="min-h-screen pt-24 px-10 pb-36 overflow-y-auto no-scrollbar">
    <h2 className="serif text-4xl font-bold mb-12">Favoritos</h2>
    <div className="grid grid-cols-2 gap-5">
      {favorites.map((w: any) => (
        <div key={w.id} onClick={() => onSelect(w)} className="glass rounded-[2.25rem] overflow-hidden active:scale-95 transition-all">
          <div className="h-40 relative">
            <img src={w.image} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
               <h4 className="text-[10px] font-bold truncate text-white">{w.name}</h4>
            </div>
          </div>
        </div>
      ))}
      {favorites.length === 0 && (
        <div className="col-span-2 py-20 text-center opacity-20">
          <Heart size={64} className="mx-auto mb-4" />
          <p className="text-[10px] uppercase font-black tracking-widest">Nenhum favorito ainda</p>
        </div>
      )}
    </div>
  </div>
);

const ProfileScreen = ({ user, theme, onThemeToggle, onLogout, onNavigate }: any) => (
  <div className="min-h-screen pt-24 px-10 pb-36 flex flex-col items-center">
    <div className="w-28 h-28 bg-burgundy text-white rounded-[3rem] mb-8 flex items-center justify-center text-4xl font-bold shadow-2xl border border-white/10 relative">
      <span>{user.name?.[0].toUpperCase()}</span>
      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gold rounded-2xl flex items-center justify-center shadow-lg">
         <Sparkles size={16} className="text-white" />
      </div>
    </div>
    <h2 className="serif text-3xl font-bold mb-1">{user.name}</h2>
    <p className="opacity-40 text-[10px] uppercase font-black tracking-[0.4em] mb-12 text-center">{user.email}</p>
    
    <div className="w-full space-y-4">
      {/* Theme Toggle */}
      <div className="glass p-7 rounded-[2.25rem] flex justify-between items-center">
        <span className="text-xs font-bold flex items-center gap-4">
          {theme === 'light' ? <Sun size={20} className="text-gold" /> : <Moon size={20} className="text-burgundy" />} 
          Aparência: {theme === 'light' ? 'Claro' : 'Escuro'}
        </span>
        <button onClick={onThemeToggle} className="w-12 h-6 bg-current bg-opacity-10 rounded-full relative transition-all">
          <div className={`absolute top-1 w-4 h-4 rounded-full transition-all bg-burgundy ${theme === 'light' ? 'right-1' : 'left-1'}`} />
        </button>
      </div>

      <div className="glass p-7 rounded-[2.25rem] flex justify-between items-center">
        <span className="text-xs font-bold flex items-center gap-4">
          <Scan size={20} className="text-burgundy" /> Scans Realizados
        </span>
        <span className="font-black text-2xl">{user.scanCount}</span>
      </div>
      
      <button onClick={() => onNavigate(Screen.CELLAR_PREFERENCES)} className="w-full glass p-7 rounded-[2.25rem] flex justify-between items-center active:bg-current active:bg-opacity-5 transition-all">
        <span className="text-xs font-bold flex items-center gap-4">
          <Settings size={20} className="text-gold" /> Ajustes da Adega
        </span>
        <ChevronRight size={16} className="opacity-20" />
      </button>

      <div className="pt-12 w-full">
        <button onClick={onLogout} className="w-full glass p-6 rounded-2xl text-red-500/60 text-[9px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4">
          <LogOut size={18} /> Encerrar Sessão
        </button>
      </div>
    </div>
  </div>
);

const CameraScreen = ({ onCapture, onCancel, onUpload }: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => { stream = s; if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(e => { console.error(e); onCancel(); });
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  const capture = () => {
    if (isCapturing) return;
    setIsCapturing(true);
    const v = videoRef.current;
    const c = canvasRef.current;
    if (v && c) {
      c.width = v.videoWidth; c.height = v.videoHeight;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.drawImage(v, 0, 0);
        onCapture(c.toDataURL('image/jpeg', 0.9).split(',')[1]);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-60" />
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="w-[85vw] h-[55vh] border-2 border-white/20 rounded-[4rem] shadow-[0_0_0_2000px_rgba(0,0,0,0.85)] relative">
          <div className="absolute inset-0 flex items-center justify-center">
             <Wine size={120} strokeWidth={0.5} className="text-white/5" />
             <div className="h-[2px] w-full bg-gold/20 absolute top-1/2 animate-[bounce_2s_infinite]" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-16 inset-x-0 flex justify-between px-16 items-center">
        <button onClick={onCancel} className="w-14 h-14 glass text-white rounded-2xl flex items-center justify-center border-white/10"><X /></button>
        <button onClick={capture} disabled={isCapturing} className="w-24 h-24 bg-white/5 backdrop-blur-3xl rounded-full p-2 border border-white/20 active:scale-95 transition-all">
          <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
            <div className={`w-16 h-16 bg-burgundy rounded-full shadow-inner ${isCapturing ? 'animate-ping' : ''}`} />
          </div>
        </button>
        <button onClick={onUpload} className="w-14 h-14 glass text-white rounded-2xl flex items-center justify-center border-white/10">
          <ImageIcon size={22} />
        </button>
      </div>
    </div>
  );
};

const CellarPreferencesScreen = ({ currentPrefs, onSave, onCancel, loading }: any) => {
  const [prefs, setPrefs] = useState<CellarPreferences>(currentPrefs);

  const toggleItem = (list: string[], item: string, field: keyof CellarPreferences) => {
    const newList = list.includes(item) 
      ? list.filter(i => i !== item)
      : [...list, item];
    setPrefs({ ...prefs, [field]: newList });
  };

  return (
    <div className="min-h-screen pt-20 pb-32 px-8 overflow-y-auto no-scrollbar animate-in slide-in-from-right duration-500">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={onCancel} className="w-10 h-10 glass rounded-xl flex items-center justify-center"><ChevronLeft size={20}/></button>
        <h2 className="serif text-3xl font-bold">Preferências</h2>
      </div>
      
      <p className="opacity-40 text-xs mb-10 leading-relaxed uppercase tracking-widest font-bold">Curadoria de Paladar</p>

      <div className="space-y-12">
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gold mb-6">Estilos Favoritos</h3>
          <div className="flex flex-wrap gap-2">
            {['Red', 'White', 'Rosé', 'Sparkling', 'Dessert'].map(type => (
              <button
                key={type}
                onClick={() => toggleItem(prefs.preferredTypes, type, 'preferredTypes')}
                className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${prefs.preferredTypes.includes(type) ? 'bg-burgundy border-burgundy text-white shadow-lg shadow-burgundy/20' : 'glass opacity-40'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-6">
            <Grape size={14} className="text-gold" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gold">Castas (Uvas)</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_GRAPES.map(grape => (
              <button
                key={grape}
                onClick={() => toggleItem(prefs.favoriteGrapes, grape, 'favoriteGrapes')}
                className={`px-4 py-2 rounded-xl text-[9px] font-bold border transition-all ${prefs.favoriteGrapes.includes(grape) ? 'bg-current text-white bg-opacity-80 border-transparent' : 'glass opacity-40'}`}
              >
                {grape}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-6">
            <MapPin size={14} className="text-gold" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gold">Regiões de Interesse</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_REGIONS.map(region => (
              <button
                key={region}
                onClick={() => toggleItem(prefs.preferredRegions, region, 'preferredRegions')}
                className={`px-4 py-2 rounded-xl text-[9px] font-bold border transition-all ${prefs.preferredRegions.includes(region) ? 'bg-current text-white bg-opacity-80 border-transparent' : 'glass opacity-40'}`}
              >
                {region}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gold mb-6">Investimento Habitual</h3>
          <div className="grid grid-cols-2 gap-3">
            {['Economical', 'Standard', 'Premium', 'Luxury'].map(range => (
              <button
                key={range}
                onClick={() => setPrefs({ ...prefs, priceRange: range as any })}
                className={`h-16 rounded-2xl flex items-center justify-center text-[9px] font-black uppercase tracking-widest border transition-all ${prefs.priceRange === range ? 'bg-burgundy border-burgundy text-white shadow-xl' : 'glass opacity-40'}`}
              >
                {range}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-20 space-y-4">
        <button 
          onClick={() => onSave(prefs)} 
          disabled={loading}
          className="w-full h-16 bg-burgundy text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          {loading ? <Loader2 className="animate-spin" /> : 'Salvar Ajustes'}
        </button>
        <button onClick={onCancel} className="w-full py-4 opacity-30 text-[10px] uppercase font-black tracking-widest">Descartar Alterações</button>
      </div>
    </div>
  );
};

const GuideDetailScreen = ({ guide, onBack }: any) => (
  <div className="min-h-screen pb-32 overflow-y-auto no-scrollbar animate-in slide-in-from-right duration-500">
    <div className="h-[30rem] relative">
      <img src={guide.image} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
      <button onClick={onBack} className="absolute top-14 left-8 w-12 h-12 glass text-white rounded-2xl flex items-center justify-center border border-white/10"><ChevronLeft /></button>
    </div>
    <div className="px-10 mt-10">
      <h1 className="serif text-5xl font-bold mb-10 leading-tight">{guide.title}</h1>
      <p className="opacity-70 leading-relaxed serif text-xl whitespace-pre-wrap">{guide.content}</p>
    </div>
  </div>
);
