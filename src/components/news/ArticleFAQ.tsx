import { useEffect, useId } from "react";
import { ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useArticleFaqs } from "@/hooks/useArticleFaqs";

interface ArticleFAQProps {
  articleId: string;
  articleTitle: string;
}

export function ArticleFAQ({ articleId, articleTitle }: ArticleFAQProps) {
  const { data: faqs, isLoading } = useArticleFaqs(articleId);
  const scriptId = useId();

  // Inject JSON-LD structured data
  useEffect(() => {
    if (!faqs || faqs.length === 0) return;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    };

    const existingScript = document.getElementById(`faq-jsonld-${scriptId}`);
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.id = `faq-jsonld-${scriptId}`;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.getElementById(`faq-jsonld-${scriptId}`);
      if (scriptToRemove && scriptToRemove.parentNode) {
        scriptToRemove.parentNode.removeChild(scriptToRemove);
      }
    };
  }, [faqs, scriptId]);

  if (isLoading || !faqs || faqs.length === 0) {
    return null;
  }

  return (
    <section className="border-t pt-8 mt-8">
      <h2 className="text-xl font-bold font-serif mb-4 flex items-center gap-2">
        <span className="w-1 h-6 rounded-full bg-primary" />
        Perguntas Frequentes
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Dúvidas comuns sobre "{articleTitle}"
      </p>
      
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={faq.id} value={`faq-${index}`}>
            <AccordionTrigger className="text-left hover:no-underline">
              <span className="font-medium pr-4">{faq.question}</span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
