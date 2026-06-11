import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Printer, FileText, Target, Award, BookOpen, 
  ScrollText, Brain, GraduationCap, Clock, Check, RefreshCw, 
  UploadCloud, ChevronDown, Calculator, Globe, Microscope, 
  Music, Dumbbell, Languages, Scale, Settings2, Copy, AlertCircle, 
  BookType, Download, Lock
} from 'lucide-react';

// URL do PDF.js
const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// A chave da API é injetada automaticamente de forma segura a partir do Environment da Vercel
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; 

// --- ESTRUTURA BNCC COM TURMAS/ANOS ---
const BNCC_STRUCTURE = {
  "Educação Infantil": {
    anos: ["Creche (0 a 3 anos)", "Pré-escola (4 e 5 anos)"],
    areas: {
      "Campos de Experiência": ["O eu, o outro e o nós", "Corpo, gestos e movimentos", "Traços, sons, cores e formas", "Escuta, fala, pensamento e imaginação", "Espaços, tempos, quantidades, relações e transformações"]
    }
  },
  "Ensino Fundamental I": {
    anos: ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"],
    areas: {
      "Linguagens": ["Língua Portuguesa", "Arte", "Educação Física", "Língua Inglesa"],
      "Matemática": ["Matemática"],
      "Ciências da Natureza": ["Ciências"],
      "Ciências Humanas": ["Geografia", "História"],
      "Ensino Religioso": ["Ensino Religioso"]
    }
  },
  "Ensino Fundamental II": {
    anos: ["6º Ano", "7º Ano", "8º Ano", "9º Ano"],
    areas: {
      "Linguagens": ["Língua Portuguesa", "Língua Inglesa", "Arte", "Educação Física"],
      "Matemática": ["Matemática"],
      "Ciências da Natureza": ["Ciências"],
      "Ciências Humanas": ["Geografia", "História"],
      "Ensino Religioso": ["Ensino Religioso"]
    }
  },
  "Ensino Médio": {
    anos: ["1ª Série", "2ª Série", "3ª Série"],
    areas: {
      "Linguagens e Tecnologias": ["Língua Portuguesa", "Arte", "Educação Física", "Língua Inglesa"],
      "Matemática e Tecnologias": ["Matemática"],
      "Ciências da Natureza": ["Biologia", "Física", "Química"],
      "Ciências Humanas e Sociais": ["História", "Geografia", "Filosofia", "Sociologia"]
    }
  }
};

const COMPETENCIAS_GERAIS = [
  { id: "CG01", desc: "Conhecimento" },
  { id: "CG02", desc: "Pensamento Científico, Crítico e Criativo" },
  { id: "CG03", desc: "Repertório Cultural" },
  { id: "CG04", desc: "Comunicação" },
  { id: "CG05", desc: "Cultura Digital" },
  { id: "CG06", desc: "Trabalho e Projeto de Vida" },
  { id: "CG07", desc: "Argumentação" },
  { id: "CG08", desc: "Autoconhecimento e Autocuidado" },
  { id: "CG09", desc: "Empatia e Cooperação" },
  { id: "CG10", desc: "Responsabilidade e Cidadania" }
];

const getSubjectIcon = (subject) => {
  if (!subject) return <BookOpen size={16} />;
  const s = subject.toLowerCase();
  if (s.includes("matemática") || s.includes("física") || s.includes("química") || s.includes("robótica")) return <Calculator size={16} />;
  if (s.includes("arte") || s.includes("música") || s.includes("formas") || s.includes("teatro")) return <Music size={16} />;
  if (s.includes("geografia") || s.includes("história") || s.includes("espaços") || s.includes("sociedade")) return <Globe size={16} />;
  if (s.includes("ciências") || s.includes("biologia") || s.includes("laboratório")) return <Microscope size={16} />;
  if (s.includes("educação física") || s.includes("movimentos") || s.includes("esporte")) return <Dumbbell size={16} />;
  if (s.includes("português") || s.includes("inglesa") || s.includes("fala") || s.includes("idioma") || s.includes("espanhol")) return <Languages size={16} />;
  if (s.includes("filosofia") || s.includes("sociologia") || s.includes("religioso") || s.includes("nós") || s.includes("projeto de vida") || s.includes("empreendedorismo")) return <Scale size={16} />;
  return <BookOpen size={16} />;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('plano'); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');
   
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfText, setPdfText] = useState("");
  const [pageRange, setPageRange] = useState({ start: 1, end: 5 });
  const [isReadingPdf, setIsReadingPdf] = useState(false);

  // --- ESTADOS DO SISTEMA DE MONETIZAÇÃO EXPRESS ---
  const [usageCount, setUsageCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  // Estados Base
  const [selectedLevel, setSelectedLevel] = useState("Ensino Fundamental I");
  const [selectedYear, setSelectedYear] = useState("1º Ano");
  const [selectedArea, setSelectedArea] = useState("Linguagens");
  const [selectedSubject, setSelectedSubject] = useState("Língua Portuguesa");
  const [customSubject, setCustomSubject] = useState(""); 

  const [meta, setMeta] = useState({
    escola: "",
    professor: "",
    data: new Date().toLocaleDateString('pt-BR'),
    tempoAula: 50,
    tema: "", 
    paginas: "",
    competencias: [], 
    extraSkills: "", 
    numQuestoes: 5,
    formatoQuestoes: "Misto (Objetiva e Discursiva)",
    nivelDificuldade: "Médio",
    turma: ""
  });

  const [plano, setPlano] = useState(null);
  const [atividade, setAtividade] = useState(null);

  const displaySubject = selectedSubject === "Outros" ? (customSubject || "Parte Diversificada") : selectedSubject;

  // --- VALIDAÇÃO DE COMPRA E CARREGAMENTO DE CONTROLE LOCAL ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('token') === 'sucesso123') {
      localStorage.setItem('docentepro_is_premium', 'true');
      setIsPremium(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const savedPremium = localStorage.getItem('docentepro_is_premium') === 'true';
      const savedUsage = parseInt(localStorage.getItem('docentepro_usage_count') || '0', 10);
      setIsPremium(savedPremium);
      setUsageCount(savedUsage);
    }
  }, []);

  // Lógica Cascata
  useEffect(() => {
    const data = BNCC_STRUCTURE[selectedLevel];
    if (data) {
      setSelectedYear(data.anos[0]);
      const areas = Object.keys(data.areas);
      if (areas.length > 0) {
        setSelectedArea(areas[0]);
        setSelectedSubject(data.areas[areas[0]][0]);
      }
    }
  }, [selectedLevel]);

  useEffect(() => {
    const data = BNCC_STRUCTURE[selectedLevel];
    if (data && data.areas[selectedArea]) {
      setSelectedSubject(data.areas[selectedArea][0]);
    }
  }, [selectedArea, selectedLevel]);

  useEffect(() => {
    if (!window.pdfjsLib) {
      const script = document.createElement('script');
      script.src = PDFJS_URL;
      script.async = true;
      script.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL; };
      document.body.appendChild(script);
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setError(null);
    } else {
      setError("Selecione um ficheiro PDF válido.");
    }
  };

  const extractText = async () => {
    if (!pdfFile || !window.pdfjsLib) return;
    setIsReadingPdf(true);
    setPdfText("");
    try {
      const buf = await pdfFile.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument(buf).promise;
      let txt = "";
      const start = Math.max(1, parseInt(pageRange.start) || 1);
      const end = Math.min(pdf.numPages, parseInt(pageRange.end) || 1);
      for (let i = start; i <= end; i++) {
        const p = await pdf.getPage(i);
        const c = await p.getTextContent();
        txt += ` [Pág ${i}]: ` + c.items.map(s => s.str).join(" ");
      }
      setPdfText(txt);
      setMeta(m => ({ ...m, paginas: `Páginas extraídas do PDF: ${start} a ${end}` }));
    } catch (e) {
      console.error(e);
      setError("Erro ao ler PDF. Tente com um intervalo menor.");
    } finally {
      setIsReadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const exportToDoc = () => {
    const isPlan = activeTab === 'plano';
    const docData = isPlan ? plano : atividade;
    
    if (!docData) {
      alert("Nenhum conteúdo para exportar. Gere o documento primeiro.");
      return;
    }

    const title = `${isPlan ? 'PLANO' : 'ATIV'}_${(meta.turma || 'Geral').replace(/[^a-z0-9]/gi, '_')}`;
    const contentId = isPlan ? 'print-plano' : 'print-atividade';
    
    const element = document.getElementById(contentId);
    if (!element) return;
    
    const contentHTML = element.innerHTML;

    const htmlFull = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #000; font-size: 11pt; line-height: 1.5; }
          h1 { font-size: 16pt; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          h3, h4 { font-size: 13pt; margin-top: 15px; margin-bottom: 10px; color: #333; }
          .flex, .grid { display: table; width: 100%; margin-bottom: 15px; }
          .flex-1, .col-span-2 { display: table-cell; padding: 5px; }
          .border-b { border-bottom: 1px solid #ccc; }
          .bg-slate-50, .bg-white { background-color: #f9f9f9; padding: 15px; border: 1px solid #ddd; margin-bottom: 15px; }
          .font-bold, .font-black { font-weight: bold; }
          .text-sm { font-size: 10pt; }
          .text-xs { font-size: 9pt; color: #666; }
          ul { margin-top: 5px; margin-bottom: 15px; padding-left: 20px; }
          li { margin-bottom: 5px; }
          svg { display: none !important; } 
          button { display: none !important; }
        </style>
      </head>
      <body>
        ${contentHTML}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlFull], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.doc`;
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  const copyToClipboard = () => {
    const contentId = activeTab === 'plano' ? 'print-plano' : 'print-atividade';
    const el = document.getElementById(contentId);
    if (!el) return;
    const textarea = document.createElement('textarea');
    textarea.value = el.innerText;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      setCopySuccess('Copiado com sucesso!');
      setTimeout(() => setCopySuccess(''), 3000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
    document.body.removeChild(textarea);
  };

  const fetchWithRetry = async (url, options, retries = 5) => {
    let lastError;
    const delays = [1000, 2000, 4000, 8000, 16000];
    
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data;
      } catch (e) {
        lastError = e;
        if (i < retries - 1) await new Promise(res => setTimeout(res, delays[i]));
      }
    }
    throw lastError;
  };

  const generate = async (type) => {
    if (!pdfText && !meta.tema) {
      setError("Por favor, digite um Tema ou extraia texto de um Livro em PDF para continuar.");
      return;
    }
    if (selectedSubject === "Outros" && !customSubject.trim()) {
      setError("Por favor, escreva o nome da disciplina na Parte Diversificada.");
      return;
    }

    // --- BLOQUEIO COMERCIAL EXCLUSIVO ---
    if (usageCount >= 3 && !isPremium) {
      setError("LIMITE_EXCEDIDO");
      return;
    }

    setLoading(true);
    setError(null);
    
    const isPlan = type === 'plano';
    const contextSource = pdfText ? `CONTEXTO EXTRAÍDO DO MATERIAL DIDÁTICO: "${pdfText.substring(0, 20000)}"` : `TEMA SOLICITADO: "${meta.tema}"`;
    
    const planSchema = {
      type: "OBJECT",
      properties: {
        titulo: { type: "STRING" },
        codigosBNCC: { type: "ARRAY", items: { type: "STRING" } },
        competenciasEspecificas: { type: "ARRAY", items: { type: "STRING" } },
        objetivosEspecificos: { type: "ARRAY", items: { type: "STRING" } },
        materiais: { type: "ARRAY", items: { type: "STRING" } },
        metodologia: { type: "ARRAY", items: { type: "STRING" } },
        adaptacao: { type: "STRING" },
        avaliacao: { type: "STRING" }
      }
    };

    const activitySchema = {
      type: "OBJECT",
      properties: {
        titulo: { type: "STRING" },
        contexto: { type: "STRING" },
        questoes: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              enunciado: { type: "STRING" },
              opcoes: { type: "ARRAY", items: { type: "STRING" } },
              gabarito: { type: "STRING" }
            }
          }
        }
      }
    };

    const systemPrompt = isPlan 
      ? `Você é um Consultor Pedagógico Especialista na BNCC Brasileira.
         Nível: ${selectedLevel}
         Ano/Turma: ${selectedYear}
         Disciplina: ${displaySubject}
         
         Instruções obrigatórias:
         1. Crie um plano de aula detalhado.
         2. Identifique e cite pelo menos 2 a 3 códigos alfanuméricos REAIS e exatos da BNCC que sejam adequados para este ano e disciplina. Se for disciplina da parte diversificada, crie correlações com as competências gerais.
         3. Inclua adaptações para inclusão (TEA/TDAH).`
      : `Você é um Professor titular de ${displaySubject} do ${selectedLevel} (${selectedYear}).
         
         Instruções obrigatórias:
         1. Crie uma atividade avaliativa ou de fixação com exatas ${meta.numQuestoes} questões.
         2. Dificuldade: ${meta.nivelDificuldade}.
         3. Formato: ${meta.formatoQuestoes}.
         4. Forneça o gabarito completo com explicações se necessário.`;

    const userQuery = `
      ${contextSource}
      Foco Opcional (Competências): ${meta.competencias.join(', ') || 'Nenhuma especificada.'}
      Código Extra do Professor: ${meta.extraSkills || 'Nenhum.'}
      Duração da Aula: ${meta.tempoAula} minutos.
    `;

    try {
      // Ajustado para o modelo estável mais recente do Gemini, solucionando o Erro 403
      const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userQuery }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { 
            responseMimeType: "application/json",
            responseSchema: isPlan ? planSchema : activitySchema
          }
        })
      });
      
      const res = JSON.parse(data.candidates[0].content.parts[0].text);
      if (isPlan) setPlano(res); else setAtividade(res);
      setActiveTab(type);
      
      // Se a geração foi bem sucedida, incrementamos o limite local de acessos gratuitos
      if (!isPremium) {
        const nextUsage = usageCount + 1;
        setUsageCount(nextUsage);
        localStorage.setItem('docentepro_usage_count', nextUsage.toString());
      }
      
    } catch (e) {
      console.error(e);
      setError(`Falha ao gerar conteúdo: ${e.message}. Verifique a sua ligação.`);
    } finally {
      setLoading(false);
    }
  };

  const currentLevelData = BNCC_STRUCTURE[selectedLevel];
  const currentAreas = currentLevelData ? Object.keys(currentLevelData.areas) : [];
  const currentSubjects = (currentLevelData && currentLevelData.areas[selectedArea]) ? currentLevelData.areas[selectedArea] : [];

  return (
    <div className="min-h-screen bg-slate-100/50 flex flex-col xl:flex-row font-sans text-slate-800 print:bg-white print:block">
      
      {/* SIDEBAR DE CONTROLO - Escondida na impressão nativa */}
      <aside className="w-full xl:w-[450px] bg-white border-r border-slate-200 h-screen flex flex-col z-50 shadow-2xl overflow-hidden shrink-0 print:hidden">
        
        <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4">
             <Brain size={140} />
          </div>
          <div className="flex items-center gap-3 mb-1 relative z-10">
            <div className="bg-blue-500/20 p-2 rounded-xl backdrop-blur-sm border border-blue-400/30">
               <GraduationCap className="text-blue-300" size={24} />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Docente<span className="text-blue-400">Pro</span></h1>
          </div>
          <p className="text-[11px] font-medium opacity-80 tracking-widest relative z-10 pl-[52px] uppercase">Planeador IA • BNCC Integrada</p>
          
          {/* Tag indicativa de plano freemium */}
          <div className="absolute bottom-2 right-4">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPremium ? 'bg-amber-400 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
              {isPremium ? "Acesso Premium" : `Acessos Gratuitos: ${usageCount}/3`}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          
          {/* MODAL / BOX EM CASO DE LIMITE ATINGIDO */}
          {error === "LIMITE_EXCEDIDO" && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-orange-200 p-5 rounded-2xl shadow-sm text-center animate-in fade-in zoom-in-95 duration-200">
              <Lock size={32} className="text-orange-600 mx-auto mb-2" />
              <h3 className="font-black text-slate-900 text-base mb-1">Você atingiu o limite gratuito!</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Desbloqueie o acesso ilimitado para gerar infinitos planos de aula e atividades focadas na BNCC.
              </p>
              {/* SUBSTITUA O LINK ABAIXO PELO SEU LINK DA PLATAFORMA DE PAGAMENTO DA HUBLA */}
              <a 
                href="https://seu-link-da-hubla-aqui.com" 
                target="_blank" 
                rel="noreferrer" 
                className="inline-block w-full bg-gradient-to-r from-orange-600 to-amber-500 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-md hover:opacity-95 transition-all"
              >
                Desbloquear Acesso Ilimitado
              </a>
            </div>
          )}

          {error && error !== "LIMITE_EXCEDIDO" && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <section className="space-y-4 bg-white">
            <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
              <Target size={18} className="text-blue-600"/> Parâmetros Curriculares
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 block">Nível de Ensino</label>
                <div className="relative">
                  <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none appearance-none" value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)}>
                    {Object.keys(BNCC_STRUCTURE).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 block">Ano / Série</label>
                <div className="relative">
                  <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none appearance-none" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                    {currentLevelData?.anos.map(ano => <option key={ano} value={ano}>{ano}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 block">Área</label>
                <div className="relative">
                  <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 appearance-none" value={selectedArea} onChange={e => setSelectedArea(e.target.value)}>
                    {currentAreas.map(area => <option key={area} value={area}>{area}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 block">Disciplina</label>
                <div className="relative">
                  <select className="w-full p-2.5 bg-blue-50/50 border border-blue-200 rounded-lg text-sm font-bold text-blue-900 appearance-none" value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); if (e.target.value !== "Outros") setCustomSubject(""); }}>
                    {currentSubjects.map(subj => <option key={subj} value={subj}>{subj}</option>)}
                    <option value="Outros">Outros / P. Diversificada</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-3.5 text-blue-600 pointer-events-none" />
                </div>
              </div>
            </div>
            
            {selectedSubject === "Outros" && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 block">Nome da Disciplina</label>
                <input type="text" placeholder="Ex: Projeto de Vida, Robótica..." className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-sm font-bold text-blue-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" value={customSubject} onChange={e => setCustomSubject(e.target.value)} />
              </div>
            )}
          </section>

          <section className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
              <BookType size={18} className="text-indigo-600"/> Foco do Conteúdo
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 block">Tema ou Assunto da Aula</label>
              <input type="text" placeholder="Ex: A Revolução Industrial" className="w-full p-3 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none shadow-sm" value={meta.tema} onChange={e => setMeta({...meta, tema: e.target.value})} />
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-[10px] font-bold uppercase">Ou Material de Apoio</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <label className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <UploadCloud size={16} className="text-indigo-500" /> Extrair de Livro (PDF)
              </label>
              <input type="file" accept=".pdf" onChange={handleFileChange} className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:font-semibold file:bg-white file:text-indigo-700 file:shadow-sm hover:file:bg-indigo-50 cursor-pointer mb-3"/>
              
              {pdfFile && (
                <div className="space-y-3 pt-3 border-t border-slate-200">
                   <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Páginas:</span>
                    <div className="flex items-center gap-2">
                      <input type="number" className="w-14 p-1.5 text-xs border border-slate-300 rounded-md text-center" value={pageRange.start} onChange={e => setPageRange({...pageRange, start: e.target.value})}/>
                      <span className="text-xs text-slate-400">até</span>
                      <input type="number" className="w-14 p-1.5 text-xs border border-slate-300 rounded-md text-center" value={pageRange.end} onChange={e => setPageRange({...pageRange, end: e.target.value})}/>
                    </div>
                  </div>
                  <button onClick={extractText} disabled={isReadingPdf} className={`w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${pdfText ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                    {isReadingPdf ? <RefreshCw className="animate-spin" size={14}/> : (pdfText ? <Check size={14}/> : <ScrollText size={14}/>)}
                    {isReadingPdf ? "A extrair texto..." : (pdfText ? "Conteúdo extraído com sucesso" : "Extrair Texto do PDF")}
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
              <Settings2 size={18} className="text-slate-600"/> Configurações Gerais
            </div>
            
            <div className="grid grid-cols-2 gap-3">
               <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 block">Duração (Min)</label>
                  <div className="relative">
                    <Clock size={14} className="absolute left-3 top-3 text-slate-400"/>
                    <input type="number" className="w-full text-sm font-medium border border-slate-200 rounded-lg p-2.5 pl-9 outline-none focus:border-blue-400" value={meta.tempoAula} onChange={e => setMeta({...meta, tempoAula: e.target.value})} />
                  </div>
               </div>
               <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 block">Professor(a)</label>
                  <input type="text" placeholder="Nome" className="w-full text-sm font-medium border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-400" value={meta.professor} onChange={e => setMeta({...meta, professor: e.target.value})} />
               </div>
            </div>

            <div className="grid grid-cols-1">
               <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 block">Nome da Turma/Sala</label>
               <input type="text" placeholder="Ex: Turma A, Manhã..." className="w-full text-sm font-medium border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-400" value={meta.turma} onChange={e => setMeta({...meta, turma: e.target.value})} />
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-[11px] font-black text-slate-800 uppercase block tracking-wider">Parâmetros da Atividade</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Dificuldade</label>
                    <select className="w-full text-sm font-medium bg-white border border-slate-200 rounded-lg p-2 outline-none" value={meta.nivelDificuldade} onChange={e => setMeta({...meta, nivelDificuldade: e.target.value})}>
                      <option>Fácil</option><option>Médio</option><option>Difícil</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Qtd. Questões</label>
                    <input type="number" className="w-full text-sm font-medium bg-white border border-slate-200 rounded-lg p-2 outline-none" value={meta.numQuestoes} onChange={e => setMeta({...meta, numQuestoes: e.target.value})} />
                </div>
              </div>
              <div>
                 <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Formato</label>
                 <select className="w-full text-sm font-medium bg-white border border-slate-200 rounded-lg p-2 outline-none" value={meta.formatoQuestoes} onChange={e => setMeta({...meta, formatoQuestoes: e.target.value})}>
                   <option>Misto (Objetiva e Discursiva)</option>
                   <option>Apenas Múltipla Escolha</option>
                   <option>Apenas Discursiva</option>
                 </select>
              </div>
            </div>
            
            <div>
               <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 block">Código BNCC Manual (Opcional)</label>
               <input type="text" placeholder="Ex: EF03MA05" className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:border-blue-400 outline-none" value={meta.extraSkills} onChange={e => setMeta({...meta, extraSkills: e.target.value})} />
            </div>
          </section>

        </div>

        <div className="p-5 border-t border-slate-200 bg-white grid grid-cols-2 gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-20">
          <button disabled={loading} onClick={() => generate('plano')} className="bg-slate-900 text-white h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md active:scale-95 disabled:opacity-70">
            {loading && activeTab === 'plano' ? <RefreshCw className="animate-spin" size={18} /> : <ScrollText size={18}/>} Criar Plano
          </button>
          <button disabled={loading} onClick={() => generate('atividade')} className="bg-white border-2 border-slate-900 text-slate-900 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-70">
            {loading && activeTab === 'atividade' ? <RefreshCw className="animate-spin" size={18} /> : <FileText size={18}/>} Criar Ativ.
          </button>
        </div>
      </aside>

      {/* ÁREA DE VISUALIZAÇÃO */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-[#eef2f6] print:bg-white print:overflow-visible print:block">
        
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-white shadow-xl rounded-full p-1.5 flex gap-1 print:hidden border border-slate-100">
          <button onClick={() => setActiveTab('plano')} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'plano' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
            <ScrollText size={16}/> Plano de Aula
          </button>
          <button onClick={() => setActiveTab('atividade')} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'atividade' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
            <FileText size={16}/> Avaliação / Fixação
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-28 pb-20 custom-scrollbar flex justify-center w-full print:p-0 print:overflow-visible print:block">

          {/* VISUALIZAÇÃO DO PLANO */}
          {activeTab === 'plano' && plano && (
            <div className="bg-white shadow-2xl rounded-sm w-full max-w-[210mm] min-h-[297mm] relative transition-all duration-300 ring-1 ring-slate-200 print:shadow-none print:ring-0 print:max-w-none print:w-full">
              
              <div className="absolute top-6 right-[-70px] flex flex-col gap-3 print:hidden">
                <button onClick={copyToClipboard} className="bg-slate-800 text-white p-3.5 rounded-full shadow-lg hover:bg-slate-700 transition-transform hover:scale-110 group relative" title="Copiar texto">
                  <Copy size={20}/>
                  {copySuccess && <span className="absolute right-16 top-2.5 bg-slate-800 text-white text-xs px-2 py-1 rounded font-medium shadow-md whitespace-nowrap">{copySuccess}</span>}
                </button>
                <button onClick={exportToDoc} className="bg-blue-600 text-white p-3.5 rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-110" title="Exportar para Word">
                  <Download size={20}/>
                </button>
                <button onClick={handlePrint} className="bg-slate-800 text-white p-3.5 rounded-full shadow-lg hover:bg-slate-700 transition-transform hover:scale-110" title="Imprimir / Guardar PDF (Nativo)">
                  <Printer size={20}/>
                </button>
              </div>

              <div id="print-plano" className="p-[20mm] text-slate-800">
                
                <div className="border-b-2 border-slate-900 pb-5 mb-8 flex justify-between items-end">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 m-0 leading-none">Plano de Aula</h1>
                    <p className="text-sm font-bold text-slate-500 mt-2 tracking-wide flex items-center gap-2">
                       {getSubjectIcon(displaySubject)} {displaySubject} <span className="text-slate-300">|</span> {selectedLevel}
                    </p>
                  </div>
                  <div className="text-right">
                     <p className="text-sm font-semibold text-slate-500">{meta.data}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-8 gap-y-4 mb-8 text-sm">
                  <div className="flex-1 min-w-[200px] border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block mb-0.5">Professor(a)</span>
                    <span className="font-semibold text-base text-slate-800">{meta.professor || "Não informado"}</span>
                  </div>
                  <div className="flex-1 min-w-[100px] border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block mb-0.5">Turma/Ano</span>
                    <span className="font-semibold text-base text-slate-800">{selectedYear} {meta.turma ? `- ${meta.turma}` : ''}</span>
                  </div>
                  <div className="w-full border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block mb-0.5">Tema Principal</span>
                    <span className="font-black text-xl text-blue-900">{plano.titulo}</span>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="font-bold text-lg text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                    <Target size={20} className="text-blue-500"/> Fundamentação e Objetivos
                  </h3>
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                    <div>
                      <span className="font-bold text-xs text-slate-800 uppercase tracking-wide block mb-2">Habilidades BNCC</span>
                      <ul className="space-y-1">
                        {plano.codigosBNCC?.map((codigo, idx) => (
                           <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></div>
                             {codigo}
                           </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-800 uppercase tracking-wide block mb-2 pt-2 border-t border-slate-200">Objetivos Específicos</span>
                      <ul className="space-y-1">
                        {plano.objetivosEspecificos?.map((obj, idx) => (
                           <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0"></div>
                             {obj}
                           </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="font-bold text-lg text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                    <ScrollText size={20} className="text-emerald-500"/> Desenvolvimento ({meta.tempoAula} min)
                  </h3>
                  <div className="space-y-4 pl-2">
                    {plano.metodologia?.map((passo, idx) => (
                      <div key={idx} className="flex gap-4 items-start">
                        <div className="w-7 h-7 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border border-emerald-200">{idx+1}</div>
                        <p className="text-sm text-slate-700 pt-1 leading-relaxed">{passo}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                       <BookOpen size={20} className="text-amber-500"/> Materiais
                    </h3>
                    <ul className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-full space-y-2">
                       {plano.materiais?.map((mat, idx) => (
                         <li key={idx} className="text-sm text-slate-700 flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-amber-400"></div>{mat}</li>
                       ))}
                      {meta.paginas && <li className="mt-3 text-xs font-bold text-indigo-600 bg-indigo-50 p-2 rounded">{meta.paginas}</li>}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                       <Award size={20} className="text-purple-500"/> Avaliação
                    </h3>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-full text-sm text-slate-700 leading-relaxed">
                      {plano.avaliacao}
                    </div>
                  </div>
                </div>

                <div className="border border-orange-200 bg-orange-50 p-5 rounded-xl break-inside-avoid">
                   <h4 className="font-bold text-orange-900 text-sm mb-2 flex items-center gap-2"><Sparkles size={18}/> Inclusão e Adaptação Curricular</h4>
                   <p className="text-sm text-orange-800 leading-relaxed">{plano.adaptacao}</p>
                </div>
              </div>
            </div>
          )}

          {/* VISUALIZAÇÃO DA ATIVIDADE */}
          {activeTab === 'atividade' && atividade && (
             <div className="bg-white shadow-2xl rounded-sm w-full max-w-[210mm] min-h-[297mm] relative transition-all duration-300 ring-1 ring-slate-200 print:shadow-none print:ring-0 print:max-w-none print:w-full">
               
               <div className="absolute top-6 right-[-70px] flex flex-col gap-3 print:hidden">
                <button onClick={copyToClipboard} className="bg-slate-800 text-white p-3.5 rounded-full shadow-lg hover:bg-slate-700 transition-transform hover:scale-110 group relative" title="Copiar texto">
                  <Copy size={20}/>
                  {copySuccess && <span className="absolute right-16 top-2.5 bg-slate-800 text-white text-xs px-2 py-1 rounded font-medium shadow-md whitespace-nowrap">{copySuccess}</span>}
                </button>
                <button onClick={exportToDoc} className="bg-blue-600 text-white p-3.5 rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-110" title="Exportar para Word">
                  <Download size={20}/>
                </button>
                <button onClick={handlePrint} className="bg-slate-800 text-white p-3.5 rounded-full shadow-lg hover:bg-slate-700 transition-transform hover:scale-110" title="Imprimir / Salvar PDF">
                  <Printer size={20}/>
                </button>
              </div>

              <div id="print-atividade" className="p-[20mm] text-slate-900">
                
                <div className="border-2 border-slate-800 p-5 rounded-xl mb-8">
                   <div className="flex justify-between items-center border-b border-slate-300 pb-3 mb-3">
                      <div className="flex items-center gap-2 text-slate-900 font-black text-lg uppercase tracking-wide">
                         {getSubjectIcon(displaySubject)} {meta.escola || "Instituição de Ensino"}
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                      <div className="col-span-2 border-b border-slate-200 pb-1 flex items-end">
                         <span className="font-bold mr-2">Aluno(a):</span> 
                         <div className="flex-1 border-b border-slate-400"></div>
                      </div>
                      <div className="border-b border-slate-200 pb-1"><span className="font-bold">Turma/Ano:</span> {selectedYear} {meta.turma ? `- ${meta.turma}` : ''}</div>
                      <div className="border-b border-slate-200 pb-1"><span className="font-bold">Data:</span> ___/___/20__</div>
                      <div className="border-b border-slate-200 pb-1"><span className="font-bold">Professor(a):</span> {meta.professor}</div>
                      <div className="border-b border-slate-200 pb-1"><span className="font-bold">Disciplina:</span> {displaySubject}</div>
                   </div>
                </div>

                <div className="text-center mb-8">
                  <h1 className="font-black text-2xl uppercase text-slate-900 mb-2 tracking-tight">{atividade.titulo}</h1>
                  <span className="inline-block text-[10px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest border border-slate-200">
                    Nível: {meta.nivelDificuldade}
                  </span>
                </div>

                {atividade.contexto && (
                  <div className="mb-8 text-justify text-sm leading-relaxed text-slate-700 p-5 bg-slate-50 border border-slate-200 rounded-xl italic">
                    {atividade.contexto}
                  </div>
                )}

                <div className="space-y-10">
                  {atividade.questoes?.map((q, i) => (
                    <div key={i} className="no-break text-sm">
                      <div className="flex gap-3 mb-4">
                        <span className="font-black text-lg text-slate-900">{i+1}.</span>
                        <p className="text-slate-800 font-semibold text-base pt-0.5">{q.enunciado}</p>
                      </div>

                      {q.opcoes && q.opcoes.length > 0 ? (
                        <div className="pl-8 space-y-3">
                          {q.opcoes.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-start gap-3">
                              <div className="w-5 h-5 mt-0.5 rounded-full border border-slate-400 flex items-center justify-center text-[10px] text-slate-700 shrink-0 font-bold">
                                {String.fromCharCode(65 + optIdx)}
                              </div>
                              <span className="text-slate-700 text-base">{opt}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="pl-8 mt-8 space-y-8">
                           <div className="border-b border-slate-400 w-full"></div>
                           <div className="border-b border-slate-400 w-full"></div>
                           <div className="border-b border-slate-400 w-full"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-16 pt-6 border-t-2 border-dashed border-slate-300 bg-slate-50 p-6 rounded-xl print:bg-transparent print:border-t-2 print:border-solid">
                  <strong className="uppercase block mb-4 text-slate-800 text-sm tracking-wide">Gabarito e Expectativas de Resposta (Professor):</strong>
                  <div className="space-y-3">
                    {atividade.questoes?.map((q, i) => (
                      <div key={i} className="text-sm flex gap-3 text-slate-700 bg-white p-3 rounded-lg border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 print:bg-transparent">
                        <span className="font-black text-slate-900 shrink-0">{i+1}.</span> 
                        <span className="leading-relaxed">{q.gabarito}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
             </div>
          )}

          {!plano && !atividade && !loading && !error && (
            <div className="flex flex-col items-center justify-center h-full w-full max-w-lg mx-auto text-center animate-in fade-in zoom-in duration-500 print:hidden">
               <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 mb-6 relative">
                 <div className="absolute inset-0 bg-blue-500/10 rounded-[2rem] blur-xl"></div>
                 <Brain size={64} className="text-blue-500 relative z-10"/>
               </div>
               <h2 className="font-black text-2xl text-slate-800 mb-3 tracking-tight">O seu Assistente Curricular</h2>
               <p className="text-base text-slate-500 leading-relaxed mb-8">
                 Configure o nível de ensino, a disciplina e o tema no painel lateral. A IA irá criar o planeamento ideal alinhado com a BNCC de forma automática.
               </p>
               <div className="flex items-center gap-4 text-sm font-semibold text-slate-400">
                  <span className="flex items-center gap-1.5 bg-slate-200/50 px-3 py-1.5 rounded-full"><Check size={14}/> Planos de Aula</span>
                  <span className="flex items-center gap-1.5 bg-slate-200/50 px-3 py-1.5 rounded-full"><Check size={14}/> Atividades</span>
                  <span className="flex items-center gap-1.5 bg-slate-200/50 px-3 py-1.5 rounded-full"><Check size={14}/> BNCC</span>
               </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
