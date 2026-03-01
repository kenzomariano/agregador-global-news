import { useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    question: "O que é o DESIGNE Notícias?",
    answer: "O DESIGNE é um portal agregador de notícias que reúne as informações mais relevantes de diversas fontes confiáveis em um único lugar, cobrindo política, economia, tecnologia, esportes, entretenimento e mais.",
  },
  {
    question: "Como as notícias são selecionadas?",
    answer: "Nossas notícias são coletadas automaticamente de fontes jornalísticas reconhecidas e organizadas por categoria. O sistema prioriza conteúdo relevante e atualizado para garantir que você receba as informações mais importantes.",
  },
  {
    question: "O DESIGNE é gratuito?",
    answer: "Sim, o acesso ao DESIGNE é totalmente gratuito. Você pode ler todas as notícias, criar uma conta para salvar preferências e interagir com o conteúdo sem nenhum custo.",
  },
  {
    question: "Como posso buscar notícias específicas?",
    answer: "Utilize a barra de busca no topo do site ou acesse a página de busca para encontrar notícias por palavras-chave. Você também pode filtrar por categorias como política, economia, tecnologia e esportes.",
  },
  {
    question: "As ofertas de produtos são confiáveis?",
    answer: "Sim, as ofertas exibidas no DESIGNE são de marketplaces reconhecidos como Mercado Livre e Shopee. Os links direcionam diretamente para as páginas oficiais dos produtos nos respectivos sites.",
  },
];

export function FAQSection() {
  useEffect(() => {
    // Inject FAQ JSON-LD
    const id = "faq-jsonld";
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = id;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });

    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold font-serif mb-4 flex items-center gap-2">
        <span className="w-1 h-6 rounded-full bg-primary" />
        Perguntas Frequentes
      </h2>
      <Accordion type="single" collapsible className="w-full">
        {FAQ_ITEMS.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
