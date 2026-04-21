/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Sparkles, 
  Palette, 
  Music, 
  Gamepad2, 
  ShieldCheck, 
  Send, 
  ArrowRight, 
  ArrowLeft, 
  Trophy, 
  RotateCcw,
  Star,
  Mic,
  BrainCircuit,
  MessageCircleQuestion,
  Lightbulb,
  Printer,
  Eye
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// Initialization for Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Page = 'home' | 'intro' | 'capabilities' | 'safety' | 'examples' | 'chat' | 'quiz' | 'activity' | 'done';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [score, setScore] = useState(0);
  const [userName, setUserName] = useState('');
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [aiImageIdea, setAiImageIdea] = useState('');
  const [aiImageUrl, setAiImageUrl] = useState('');
  const [ideaText, setIdeaText] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'أهلاً بك! أنا عبد الرحمن، روبوتك الذكي المفضل. هل لديك أي سؤال عن عالم الذكاء الاصطناعي؟ 🤖' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (currentPage === 'activity' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Adjust for high PPI screens
        const size = Math.min(window.innerWidth - 64, 400); 
        canvas.width = size;
        canvas.height = size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 5;
        ctxRef.current = ctx;
      }
    }
  }, [currentPage]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCoordinates(e);
    if (!ctxRef.current) return;
    
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (ctxRef.current) ctxRef.current.closePath();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !ctxRef.current) return;
    
    // Prevent scrolling when drawing on touch devices
    if ('touches' in e) {
      // e.preventDefault(); // Handled by touch-none class but good to keep in mind
    }

    const { x, y } = getCoordinates(e);
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  };

  const clearCanvas = () => {
    if (!ctxRef.current || !canvasRef.current) return;
    ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasDrawn(false);
    setAiImageIdea('');
  };

  const generateAiResponse = async () => {
    setIsGenerating(true);
    setIsImageLoading(false);
    setAiImageUrl('');
    setAiImageIdea('');

    try {
      // 1. Get creative analysis and a specialized prompt from Gemini
      let contents: any[] = [
        { text: `أنت الروبوت عبد الرحمن. أمامك فكرة طفل للذكاء الاصطناعي. الفكرة المكتوبة هي: "${ideaText}". كما توجد رسمة مرفقة (إذا رسم شيئاً). 
        المطلوب منك شيئان بدقة:
        1. رد مبهج للطفل بالعربية يصف خيالك لقصته أو رسمته.
        2. سطر أخير يبدأ بكلمة "IMAGE_PROMPT:" وبعدها وصف للصورة بالإنجليزية فقط ليتم رسمها (مثلاً: IMAGE_PROMPT: a flying blue cat in outer space, colorful cartoon style).` }
      ];

      if (hasDrawn && canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];
        contents.push({ inlineData: { data: base64Data, mimeType: "image/png" } });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: contents }]
      });

      const fullText = response.text || '';
      
      // Extract prompt and clean text
      const promptMatch = fullText.match(/IMAGE_PROMPT:\s*(.*)/i);
      const cleanText = fullText.replace(/IMAGE_PROMPT:.*$/i, '').trim();
      
      setAiImageIdea(cleanText || 'يا لها من فكرة مذهلة! سأحولها إلى حقيقة بسحري الخاص! ✨');
      
      if (promptMatch && promptMatch[1]) {
        const generatedPrompt = encodeURIComponent(promptMatch[1].trim());
        const finalUrl = `https://image.pollinations.ai/prompt/${generatedPrompt}?width=512&height=512&nologo=true&enhance=true&seed=${Math.floor(Math.random() * 1000000)}`;
        setAiImageUrl(finalUrl);
        setIsImageLoading(true);
      } else {
        const fallbackPrompt = encodeURIComponent(ideaText || 'magical happy robot cartoon');
        setAiImageUrl(`https://image.pollinations.ai/prompt/${fallbackPrompt}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`);
        setIsImageLoading(true);
      }

    } catch (err) {
      console.error(err);
      setAiImageIdea('يا لها من مخيلة واسعة! فكرتك رائعة جداً وسأجعلها تلمع مثل الألماس!');
      setAiImageUrl(`https://image.pollinations.ai/prompt/${encodeURIComponent(ideaText || 'magic sparkle')}?seed=${Date.now()}`);
      setIsImageLoading(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatInput('');
    setIsTyping(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userMessage,
        config: {
          systemInstruction: "أنت روبوت كرتوني ودود اسمه 'عبد الرحمن'. مهمتك هي شرح الذكاء الاصطناعي للأطفال (6-12 سنة) بأسلوب بسيط جداً ومشوق. استخدم الإيموجي وتجنب المصطلحات المعقدة. إذا سألك الطفل عن شيء غير متعلق بالذكاء الاصطناعي، حاول ربطه به بشكل طريف.",
        }
      });
      
      const botText = response.text || 'عذراً، أواجه بعض الصعوبات التقنية! لنحاول مرة أخرى 🤖';
      setMessages(prev => [...prev, { role: 'bot', text: botText }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'bot', text: 'أوه! يبدو أن بطاريتي ضعيفة قليلاً. هل يمكنك إعادة السؤال؟ ✨' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const pages: Record<Page, React.ReactNode> = React.useMemo(() => ({
    home: (
      <div className="flex flex-col items-center text-center gap-8 py-12 px-4">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white px-6 py-2 rounded-full border-4 border-slate-900 font-bold text-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
        >
          👨‍🏫 إعداد المعلم/ عبدالرحمن معشي
        </motion.div>

        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          className="relative"
        >
          <div className="w-48 h-48 bg-[var(--color-accent)] rounded-full flex items-center justify-center border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
            <Bot size={100} className="text-slate-900" />
          </div>
          <div className="absolute -top-4 -right-4 bg-[var(--color-primary)] p-3 rounded-full border-4 border-slate-900 animate-bounce">
            <Sparkles className="text-white" />
          </div>
        </motion.div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 leading-tight">
          مغامرة <span className="text-[var(--color-primary)]">الذكاء الاصطناعي</span> <br /> مع عبد الرحمن
        </h1>
        
        <p className="text-xl md:text-2xl font-medium text-slate-600 max-w-xl">
          هل أنت مستعد لاكتشاف سحر المستقبل؟ انضم إلى الروبوت عبد الرحمن في رحلة مذهلة! 🚀
        </p>
        
        <button 
          onClick={() => setCurrentPage('intro')}
          className="cartoon-button text-2xl flex items-center gap-3 active:scale-95"
        >
          هيا بنا نبدأ! <ArrowLeft size={32} />
        </button>
      </div>
    ),
    
    intro: (
      <div className="max-w-4xl mx-auto py-10 px-4 flex flex-col gap-8">
        <div className="flex items-center gap-4 text-[var(--color-primary)]">
          <BrainCircuit size={48} />
          <h2 className="text-4xl font-bold">ما هو الذكاء الاصطناعي؟</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="cartoon-card bg-blue-50">
            <h3 className="text-2xl font-bold mb-4">🤖 الروبوت الذكي</h3>
            <p className="text-lg leading-relaxed">
              تخيل أن هناك "صديقاً رقمياً" يتعلم كيف يفكر مثلنا! هو لا يملك مخاً حقيقياً، لكنه يملك الكثير من المعلومات التي تساعده على حل المشكلات.
            </p>
          </div>
          <div className="cartoon-card bg-orange-50">
            <h3 className="text-2xl font-bold mb-4">✨ الذكاء "التوليدي"</h3>
            <p className="text-lg leading-relaxed">
              كلمة "توليدي" تعني "صناعة شيء جديد". مثل الرسام الذي يرسم لوحة لأول مرة، أو الشيف الذي يخترع أكلة لذيذة!
            </p>
          </div>
        </div>

        <div className="speech-bubble mt-8">
          <p className="text-xl font-bold flex items-center gap-2">
             روبوتي يقول: هل تعتقد أن الروبوت يستطيع رسم صورة لك لو وصفته؟ 🤔
          </p>
        </div>

        <div className="flex justify-between items-center mt-8">
          <button onClick={() => setCurrentPage('home')} className="flex items-center gap-2 font-bold text-slate-500"><ArrowRight /> عودة</button>
          <button onClick={() => setCurrentPage('capabilities')} className="cartoon-button">التالي <ArrowLeft /></button>
        </div>
      </div>
    ),

    capabilities: (
      <div className="max-w-5xl mx-auto py-10 px-4 flex flex-col gap-10">
        <h2 className="text-4xl font-bold text-center">ماذا يمكن لعبد الرحمن أن يفعل؟ 🎨</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Palette, title: 'رسم الصور', color: 'bg-pink-100', text: 'يستطيع رسم أي شيء تتخيله في ثوانٍ!' },
            { icon: Sparkles, title: 'تأليف القصص', color: 'bg-purple-100', text: 'احكي له بدايتك وسيكمل لك مغامرة رائعة.' },
            { icon: Music, title: 'صنع الموسيقى', color: 'bg-blue-100', text: 'ألحان جميلة وأغانٍ ممتعة لكل الأذواق.' },
            { icon: Gamepad2, title: 'ألعاب ذكية', color: 'bg-green-100', text: 'يساعدك في تصميم ألعابك الخاصة وتحدياتك.' },
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -10 }}
              className={`cartoon-card ${item.color} flex flex-col items-center text-center`}
            >
              <item.icon size={48} className="mb-4 text-slate-800" />
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-sm">{item.text}</p>
            </motion.div>
          ))}
        </div>

        <div className="cartoon-card bg-[var(--color-accent)] border-dashed">
          <p className="text-xl font-bold text-center">
            🌟 "الذكاء الاصطناعي لا يسرق إبداعك، بل هو فرشاة سحرية تساعدك لتبدع أكثر!"
          </p>
        </div>

        <div className="flex justify-between items-center">
          <button onClick={() => setCurrentPage('intro')} className="flex items-center gap-2 font-bold text-slate-500"><ArrowRight /> عودة</button>
          <button onClick={() => setCurrentPage('safety')} className="cartoon-button">الأمان أولاً! <ArrowLeft /></button>
        </div>
      </div>
    ),

    safety: (
      <div className="max-w-4xl mx-auto py-10 px-4">
        <h2 className="text-4xl font-bold mb-8 flex items-center justify-center gap-4">
          <ShieldCheck className="text-green-500" size={48} /> كيف نستخدمه بأمان؟
        </h2>
        
        <div className="flex flex-col gap-6">
          {[
            'استخدمه دائماً بمساعدة والديك أو معلمك 🧑‍🏫',
            'لا تشارك معلوماتك الشخصية (اسمك كاملاً أو عنوانك) 🏠',
            'تذكر أن الذكاء الاصطناعي قد يخطئ أحياناً، فكر دائماً فيما يقوله 🧠',
            'استخدم إبداعك لصناعة أشياء جميلة ومفيدة للآخرين ❤️',
          ].map((tip, i) => (
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              key={i} 
              className="cartoon-card flex items-center gap-4 text-xl font-bold border-secondary"
            >
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-white shrink-0">
                {i + 1}
              </div>
              {tip}
            </motion.div>
          ))}
        </div>

        <div className="flex justify-between items-center mt-12">
          <button onClick={() => setCurrentPage('capabilities')} className="flex items-center gap-2 font-bold text-slate-500"><ArrowRight /> عودة</button>
          <button onClick={() => setCurrentPage('examples')} className="cartoon-button">أمثلة رائعة <ArrowLeft /></button>
        </div>
      </div>
    ),

    examples: (
      <div className="max-w-5xl mx-auto py-10 px-4 flex flex-col gap-8">
        <h2 className="text-4xl font-bold text-center mb-4">أمثلة حقيقية للذكاء الاصطناعي 🌟</h2>
        
        <div className="flex flex-col gap-8">
          {/* Example 1: Text AI */}
          <div className="cartoon-card bg-orange-50 flex flex-col md:flex-row gap-6 items-center">
            <div className="w-20 h-20 bg-orange-200 rounded-2xl flex items-center justify-center shrink-0 border-4 border-slate-900">
              <Mic size={40} className="text-orange-600" />
            </div>
            <div className="flex-1 text-right">
              <h3 className="text-2xl font-black mb-2">1. المساعد الذكي (مثل Gemini)</h3>
              <p className="text-lg mb-4">هذا النوع ممتاز في الكتابة والإجابة على الأسئلة.</p>
              <div className="bg-white/60 p-4 rounded-xl border-2 border-slate-300">
                <p className="font-bold text-slate-700 mb-1">كيف تستخدمه؟</p>
                <p>تحدث معه وكأنه صديقك! اطلب منه: "اكتب لي قصة عن قطة تذهب للقمر" أو "ساعدني في حل لغز".</p>
              </div>
            </div>
          </div>

          {/* Example 2: Image AI */}
          <div className="cartoon-card bg-blue-50 flex flex-col md:flex-row gap-6 items-center">
             <div className="w-20 h-20 bg-blue-200 rounded-2xl flex items-center justify-center shrink-0 border-4 border-slate-900">
              <Palette size={40} className="text-blue-600" />
            </div>
            <div className="flex-1 text-right">
              <h3 className="text-2xl font-black mb-2">2. الرسام الذكي (مثل Firefly)</h3>
              <p className="text-lg mb-4">يستطيع تحويل الكلمات إلى لوحات فنية مذهلة.</p>
              <div className="bg-white/60 p-4 rounded-xl border-2 border-slate-300">
                <p className="font-bold text-slate-700 mb-1">كيف تستخدمه؟</p>
                <p>صف له ما يدور في خيالك بدقة! قل له: "ارسم لي تنيناً أخضر يحمل كعكة عيد ميلاد بأسلوب كرتوني".</p>
              </div>
            </div>
          </div>

          {/* Example 3: Music AI */}
          <div className="cartoon-card bg-purple-50 flex flex-col md:flex-row gap-6 items-center">
             <div className="w-20 h-20 bg-purple-200 rounded-2xl flex items-center justify-center shrink-0 border-4 border-slate-900">
              <Music size={40} className="text-purple-600" />
            </div>
            <div className="flex-1 text-right">
              <h3 className="text-2xl font-black mb-2">3. الملحن الذكي (مثل Suno)</h3>
              <p className="text-lg mb-4">يصنع ألحاناً وأغاني لم تسمعها من قبل.</p>
              <div className="bg-white/60 p-4 rounded-xl border-2 border-slate-300">
                <p className="font-bold text-slate-700 mb-1">كيف تستخدمه؟</p>
                <p>اختر نوع الموسيقى وموضوع الأغنية، وسيقوم بصنع اللحن والكلمات لك في لحظات!</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-8">
          <button onClick={() => setCurrentPage('safety')} className="flex items-center gap-2 font-bold text-slate-500"><ArrowRight /> عودة</button>
          <button onClick={() => setCurrentPage('chat')} className="cartoon-button">تحدث مع عبد الرحمن <ArrowLeft /></button>
        </div>
      </div>
    ),

    chat: (
      <div className="max-w-3xl mx-auto py-6 px-4 h-[90vh] flex flex-col gap-4">
        <div className="flex items-center justify-between border-b-4 border-slate-900 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent rounded-full border-2 border-slate-900 flex items-center justify-center">
              <Bot size={24} />
            </div>
            <div>
              <h3 className="font-bold text-xl">دردشة مع عبد الرحمن</h3>
              <p className="text-xs text-green-600 font-bold">● متصل الآن ومستعد للمساعدة!</p>
            </div>
          </div>
          <button onClick={() => setCurrentPage('quiz')} className="text-[var(--color-primary)] font-bold flex items-center gap-1 hover:underline">
            تخط وتوجه للمسابقة <ArrowLeft size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-hide">
          {messages.map((msg, i) => (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key={i} 
              className={`max-w-[85%] p-4 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] ${
                msg.role === 'user' 
                ? 'self-start bg-[var(--color-secondary)] text-white' 
                : 'self-end bg-white text-slate-800'
              }`}
            >
              {msg.text}
            </motion.div>
          ))}
          {isTyping && (
            <div className="self-end bg-white p-4 rounded-2xl border-4 border-slate-900 flex gap-2">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleChat} className="flex gap-2 p-2">
          <input 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="اسأل عبد الرحمن أي شيء..."
            className="flex-1 cartoon-card !py-3 !px-4 outline-none focus:border-[var(--color-primary)]"
          />
          <button disabled={isTyping} className="cartoon-button !p-3">
            <Send size={24} />
          </button>
        </form>
      </div>
    ),

    quiz: <QuizComponent onComplete={(finalScore) => { setScore(finalScore); setCurrentPage('activity'); }} />,
    
    activity: (
      <div className="max-w-4xl mx-auto py-10 px-4 text-center">
        <h2 className="text-4xl font-bold mb-6">نشاط عملي: كن مبدعاً! 🎨</h2>
        <div className="cartoon-card bg-white mb-8">
          <p className="text-2xl font-bold mb-4">عبّر عن فكرتك بالرسم أو الكتابة!</p>
          <p className="text-lg text-slate-600 mb-6 italic">"تخيل لو قلت للذكاء الاصطناعي: ارسم فيلاً يطير ببالونات وردية فوق جبال من الشوكولاتة"</p>
          
          <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
            {/* Input Side */}
            <div className="w-full lg:w-1/2 flex flex-col gap-6">
              {/* Text Input */}
              <div className="flex flex-col gap-2 text-right">
                <label className="font-bold text-slate-700 flex items-center gap-2">✍️ اكتب فكرتك هنا:</label>
                <textarea 
                  value={ideaText}
                  onChange={(e) => setIdeaText(e.target.value)}
                  className="cartoon-card !p-4 min-h-[100px] text-lg outline-none focus:border-[var(--color-primary)] transition-all resize-none z-20"
                  placeholder="مثلاً: أريد قطة تعزف على العود في القمر..."
                />
              </div>

              {/* Drawing Side */}
              <div className="flex flex-col gap-2 text-right">
                <label className="font-bold text-slate-700 flex items-center gap-2">🎨 أو ارسمها هنا:</label>
                <div className="relative bg-white border-4 border-dashed border-slate-300 rounded-2xl overflow-hidden group h-[300px] w-full">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{ width: '100%', height: '100%', touchAction: 'none' }}
                    className="cursor-crosshair bg-white relative z-10"
                  />
                  {!hasDrawn && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 font-bold z-0">
                      <div className="flex flex-col items-center gap-2">
                        <Palette size={48} className="opacity-20" />
                        <span className="opacity-40">ارسم شيئاً هنا بيدك!</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 justify-center mt-2">
                  <button onClick={clearCanvas} className="cartoon-button !py-2 !px-4 !bg-slate-200 !text-slate-700 flex items-center gap-2 text-sm z-20">
                    <RotateCcw size={16} /> مسح اللوحة
                  </button>
                  <button 
                    onClick={generateAiResponse} 
                    disabled={(!hasDrawn && !ideaText.trim()) || isGenerating}
                    className={`cartoon-button !py-2 !px-4 flex items-center gap-2 text-sm z-20 ${((!hasDrawn && !ideaText.trim()) || isGenerating) ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-105'}`}
                  >
                    <Bot size={16} /> اسأل عبد الرحمن
                  </button>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center self-center text-[var(--color-primary)]">
              <ArrowLeft size={48} className="animate-pulse" />
            </div>

            {/* AI Result Side */}
            <div className="w-full lg:w-1/2 flex flex-col gap-4 self-stretch h-full">
               <label className="font-bold text-slate-700 text-right">🤖 سحر عبد الرحمن:</label>
               <div className="cartoon-card bg-accent flex flex-col items-center justify-center text-slate-700 font-bold min-h-[350px] flex-1 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div 
                      key="generating"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-4"
                    >
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                        <BrainCircuit size={64} className="text-[var(--color-primary)]" />
                      </motion.div>
                      <p className="animate-pulse">عبد الرحمن يفكّر في فكرتك المذهلة...</p>
                    </motion.div>
                  ) : aiImageIdea ? (
                    <motion.div 
                      key="result"
                      initial={{ scale: 0.9, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      className="flex flex-col gap-4 p-4 text-right w-full h-full overflow-y-auto"
                    >
                      {aiImageUrl && (
                        <div className="relative group min-h-[300px] flex items-center justify-center bg-slate-50 rounded-2xl overflow-hidden border-4 border-slate-900 shadow-md">
                          {isImageLoading && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 gap-3">
                              <motion.div 
                                animate={{ rotate: 360, scale: [1, 1.2, 1] }} 
                                transition={{ repeat: Infinity, duration: 2 }}
                              >
                                <Palette size={48} className="text-[var(--color-primary)]" />
                              </motion.div>
                              <p className="font-bold text-slate-700 animate-pulse">عبد الرحمن يرسم لوحتك الآن...</p>
                            </div>
                          )}
                          <img 
                            src={aiImageUrl} 
                            alt="Generated by AI" 
                            className={`w-full aspect-square object-cover transition-opacity duration-500 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                            onLoad={() => setIsImageLoading(false)}
                            onError={() => setIsImageLoading(false)}
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-2 right-2 bg-white/90 p-2 rounded-lg border-2 border-slate-900 font-bold text-xs z-10">
                            رسمة سحرية ✨
                          </div>
                        </div>
                      )}
                      <div className="bg-white/80 p-4 rounded-xl border-2 border-slate-900 leading-relaxed text-lg shadow-sm">
                        {aiImageIdea}
                      </div>
                      <div className="text-sm font-bold bg-[var(--color-secondary)] text-white p-2 rounded-lg self-start flex items-center gap-2">
                        <Sparkles size={14} /> خيالك لا حدود له!
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                      className="flex flex-col items-center gap-4 text-slate-500"
                    >
                      <Sparkles size={64} />
                      <p className="max-w-[200px] text-center">ارسم أو اكتب شيئاً ثم اضغط على زر عبد الرحمن لرؤية السحر!</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => setCurrentPage('done')} className="cartoon-button text-2xl px-12">أنهيت المغامرة! 🎉</button>
      </div>
    ),

    done: (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center gap-8 relative overflow-hidden">
        {score >= 500 && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Simple confetti could be added here if static or with a library */}
          </div>
        )}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: 360 }}
          transition={{ type: 'spring', damping: 10 }}
          className="w-40 h-40 bg-[var(--color-accent)] rounded-full flex items-center justify-center border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]"
        >
          <Trophy size={80} className="text-slate-900" />
        </motion.div>
        
        <h2 className="text-5xl font-black">أحسنت يا بطل! 🥇</h2>
        <p className="text-2xl font-bold text-slate-600">درجتك النهائية: {score} من 1000</p>
        
        <div className="cartoon-card max-w-sm w-full bg-white flex flex-col gap-4">
          <h3 className="font-bold">اكتب اسمك (ليظهر في الشهادة):</h3>
          <input 
            value={userName}
            className="cartoon-card !p-3 text-center text-xl font-bold border-[var(--color-primary)]" 
            placeholder="اكتب اسمك هنا يا بطل..." 
            onChange={(e) => setUserName(e.target.value)}
          />
        </div>

        <div className="cartoon-card max-w-lg bg-green-50">
          <p className="text-xl leading-relaxed">
            لقد تعلمت اليوم أساسيات الذكاء الاصطناعي. تذكر دائماً أنك أنت القائد، وأن التكنولوجيا هي أداة لتساعدك في جعل العالم مكاناً أفضل وأجمل. استمر في الاستكشاف! 🌟
          </p>
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          <button 
            onClick={() => setIsCertModalOpen(true)} 
            className="cartoon-button bg-indigo-500 flex items-center gap-2"
          >
            معاينة الشهادة <Eye />
          </button>
          <button 
            onClick={() => { setIsCertModalOpen(true); setTimeout(() => window.print(), 500); }} 
            className="cartoon-button bg-blue-600 flex items-center gap-2"
          >
            طباعة الشهادة <Printer />
          </button>
          <button onClick={() => { setScore(0); setUserName(''); setCurrentPage('home'); }} className="cartoon-button bg-slate-400 flex items-center gap-2">
            إعادة المغامرة <RotateCcw />
          </button>
        </div>

        <AnimatePresence>
          {isCertModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative bg-white p-2 rounded-3xl border-8 border-slate-900 shadow-2xl max-w-2xl w-full print:m-0 print:border-0 print:shadow-none"
              >
                <div id="certificate" className="border-4 border-dashed border-slate-300 rounded-2xl p-12 text-center flex flex-col items-center gap-6 bg-gradient-to-br from-white to-yellow-50">
                  <Bot size={64} className="text-[var(--color-primary)]" />
                  <h1 className="text-4xl font-black text-slate-900">شهادة إنجاز ذكية</h1>
                  <p className="text-xl">نفتخر بأن البطل المبدع:</p>
                  <input 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="text-5xl font-extrabold text-[var(--color-primary)] border-b-4 border-slate-900 min-w-[300px] pb-2 bg-transparent text-center focus:outline-none print:border-none"
                    placeholder="اكتب اسمك هنا..."
                  />
                  <p className="text-lg max-w-md">
                    قد أتم بنجاح مغامرة الذكاء الاصطناعي وتعلم كيف يستخدم التكنولوجيا بذكاء وإبداع! ✨
                  </p>
                  <div className="flex justify-between w-full mt-8 opacity-60">
                    <div className="text-right">
                      <p className="font-bold">التوقيع</p>
                      <p className="italic">عبد الرحمن 🤖</p>
                    </div>
                    <div className="text-left font-mono">
                      {new Date().toLocaleDateString('ar-EG')}
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-4 mt-6 print:hidden">
                  <button onClick={() => window.print()} className="cartoon-button !bg-green-500 flex items-center gap-2">
                    طباعة الشهادة <Printer />
                  </button>
                  <button onClick={() => setIsCertModalOpen(false)} className="cartoon-button !bg-slate-400">إغلاق</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    )
  }), [
    currentPage, 
    score, 
    userName, 
    isCertModalOpen, 
    isDrawing, 
    hasDrawn, 
    isGenerating, 
    aiImageIdea, 
    ideaText, 
    messages, 
    chatInput, 
    isTyping
  ]);

  return (
    <div className="min-h-screen pb-10">
      <nav className="p-4 flex justify-between items-center max-w-6xl mx-auto mb-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage('home')}>
          <div className="bg-[var(--color-primary)] p-2 rounded-xl border-2 border-slate-900">
            <Bot className="text-white" />
          </div>
          <span className="font-bold text-2xl hidden sm:inline">ذكاء الأطفال</span>
        </div>
        
        <div className="hidden lg:flex gap-4 items-center font-bold">
           <NavItem active={currentPage==='intro'} onClick={() => setCurrentPage('intro')}>البداية</NavItem>
           <NavItem active={currentPage==='capabilities'} onClick={() => setCurrentPage('capabilities')}>ماذا يفعل؟</NavItem>
           <NavItem active={currentPage==='safety'} onClick={() => setCurrentPage('safety')}>الأمان</NavItem>
           <NavItem active={currentPage==='examples'} onClick={() => setCurrentPage('examples')}>أمثلة</NavItem>
           <NavItem active={currentPage==='chat'} onClick={() => setCurrentPage('chat')}>دردشة</NavItem>
           <NavItem active={currentPage==='quiz'} onClick={() => setCurrentPage('quiz')}>المسابقة</NavItem>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-accent px-4 py-2 rounded-full border-2 border-slate-900 font-bold flex items-center gap-2">
            <Star color="orange" fill="orange" size={20} />
            <span>{score}</span>
          </div>
        </div>
      </nav>

      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {pages[currentPage]}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mt-20 text-center opacity-50 text-sm font-bold">
        صُنع بحب للأطفال المبدعين 🎈 2026
      </footer>
    </div>
  );
}

function NavItem({ children, active, onClick }: { children: React.ReactNode, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-3 py-1 rounded-lg transition-colors ${active ? 'bg-[var(--color-accent)] border-2 border-slate-900' : 'hover:bg-slate-100'}`}
    >
      {children}
    </button>
  );
}

function QuizComponent({ onComplete }: { onComplete: (score: number) => void }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null);

  const questions = [
    {
      q: 'هل الذكاء الاصطناعي "يفكر" تماماً مثل الإنسان؟',
      options: ['نعم، لديه عقل حقيقي', 'لا، هو يستخدم المعلومات ليتعلم'],
      correct: 1
    },
    {
      q: 'ماذا تعني كلمة "توليدي"؟',
      options: ['مسح الأشياء القديمة', 'صناعة شيء جديد تماماً'],
      correct: 1
    },
    {
      q: 'هل يمكن للذكاء الاصطناعي كتابة قصة مضحكة؟',
      options: ['نعم بالتأكيد!', 'لا، هو للرياضيات فقط'],
      correct: 0
    },
    {
      q: 'عند استخدام الذكاء الاصطناعي، هل نشارك أسرارنا؟',
      options: ['نعم، هو مثل الصديق', 'لا، يجب أن نحافظ على خصوصيتنا'],
      correct: 1
    },
    {
      q: 'إذا أخطأ الذكاء الاصطناعي في معلومة، ماذا نفعل؟',
      options: ['نصدقه دائماً', 'نفكر جيداً ونسأل الكبار'],
      correct: 1
    },
    {
      q: 'من هو "عبد الرحمن" في مجموعتنا؟',
      options: ['رجل فضائي', 'روبوتنا الذكي الودود'],
      correct: 1
    },
    {
      q: 'أي من هؤلاء يستخدم الذكاء الاصطناعي؟',
      options: ['المقلمة العادية', 'خريطة الهاتف التي تدلنا على الطريق'],
      correct: 1
    },
    {
      q: 'هل يمكن للذكاء الاصطناعي أن يحل مكان الإنسان في كل شيء؟',
      options: ['نعم، هو أذكى منا', 'لا، الإنسان لديه لمسة إبداع ومشاعر'],
      correct: 1
    },
    {
      q: 'ما هي أهم مهارة نحتاجها للتعامل مع الذكاء الاصطناعي؟',
      options: ['مهارة القوة العضلية', 'مهارة التفكير وطرح أسئلة جيدة'],
      correct: 1
    },
    {
      q: 'هل يمكن للذكاء الاصطناعي الرسم بأسلوب فنان مشهور؟',
      options: ['نعم، يمكنه تقليد الأساليب', 'لا، لا يعرف الفن أبداً'],
      correct: 0
    }
  ];

  const handleAnswer = (idx: number) => {
    if (idx === questions[currentQ].correct) {
      setScore(s => s + 100);
      setShowFeedback('correct');
    } else {
      setShowFeedback('wrong');
    }

    setTimeout(() => {
      setShowFeedback(null);
      if (currentQ < questions.length - 1) {
        setCurrentQ(q => q + 1);
      } else {
        onComplete(score + (idx === questions[currentQ].correct ? 100 : 0));
      }
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-3xl font-bold flex items-center gap-3"><MessageCircleQuestion /> مسابقة الأبطال!</h2>
        <span className="bg-slate-100 px-4 py-1 rounded-full border-2 border-slate-900 font-bold">السؤال {currentQ + 1} / {questions.length}</span>
      </div>

      <div className="cartoon-card relative overflow-hidden">
        <AnimatePresence>
          {showFeedback && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`absolute inset-0 z-10 flex items-center justify-center flex-col gap-4 text-white font-black text-4xl bg-opacity-90 ${showFeedback === 'correct' ? 'bg-green-500' : 'bg-red-500'}`}
            >
              {showFeedback === 'correct' ? 'إجابة رائعة! ⭐' : 'حاول ثانية! 💫'}
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}>
                {showFeedback === 'correct' ? <Trophy size={60} /> : <Lightbulb size={60} />}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <h3 className="text-2xl font-bold mb-8 text-center">{questions[currentQ].q}</h3>
        
        <div className="flex flex-col gap-4">
          {questions[currentQ].options.map((opt, i) => (
            <button 
              key={i}
              onClick={() => handleAnswer(i)}
              className="p-6 text-xl font-bold border-4 border-slate-900 rounded-2xl hover:bg-slate-50 active:bg-accent transition-colors text-right"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mt-8 bg-slate-200 h-4 rounded-full overflow-hidden border-2 border-slate-900">
        <motion.div 
          className="bg-[var(--color-primary)] h-full"
          animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
