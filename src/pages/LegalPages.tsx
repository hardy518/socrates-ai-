import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const LegalPages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");

  useEffect(() => {
    const fetchContent = async () => {
      let url = "";
      let pageTitle = "";

      if (location.pathname === "/settings/terms") {
        url = "/legal/terms.md";
        pageTitle = "서비스 이용약관";
      } else if (location.pathname === "/settings/privacy") {
        url = "/legal/privacy.md";
        pageTitle = "개인정보처리방침";
      } else if (location.pathname === "/settings/refund") {
        url = "/legal/refund.md";
        pageTitle = "취소 및 환불 규정";
      }

      setTitle(pageTitle);

      try {
        const response = await fetch(url);
        if (response.ok) {
          const text = await response.text();
          setContent(text);
        } else {
          setContent("내용을 불러오지 못했습니다.");
        }
      } catch (error) {
        console.error("Error fetching legal content:", error);
        setContent("오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => navigate("/settings")}
            className="p-2 hover:bg-secondary rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="font-bold text-lg">{title}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <article className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-p:leading-relaxed prose-a:text-primary">
             <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
             </ReactMarkdown>
          </article>
        )}
      </main>
    </div>
  );
};

export default LegalPages;
