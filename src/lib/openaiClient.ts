// lib/aiPriceService.ts - VERSION CORRIGÉE

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export class AIPriceService {
  static async generateSmartAnalysis(dbData: any, userProducts: string[]): Promise<string> {
    try {
      // Ne pas utiliser l'IA pour des cas trop simples
      if (!this.shouldUseAI(dbData)) {
        return this.generateSimpleAnalysis(dbData);
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Tu es un expert en shopping intelligent au Québec.
            Règles importantes:
            - Sois concis et pratique
            - Utilise les données fournies, n'invente rien
            - Donne des conseils spécifiques pour économiser
            - Structure: Résumé → Analyse → Recommandation
            - Utilise des émojis pour rendre ça vivant
            - Mentionne les produits manquants si nécessaire`
          },
          {
            role: "user",
            content: this.createAnalysisPrompt(dbData, userProducts)
          }
        ],
        temperature: 0.4,
        max_tokens: 400
      });

      const aiResponse = completion.choices[0]?.message?.content;
      
      if (aiResponse && this.isValidResponse(aiResponse)) {
        return aiResponse;
      }
      
      throw new Error('Réponse IA invalide');

    } catch (error) {
      console.error('❌ Erreur OpenAI:', error);
      return this.generateSimpleAnalysis(dbData);
    }
  }

  private static shouldUseAI(dbData: any): boolean {
    const { summary } = dbData;
    
    if (!summary) return false;
    
    // Utiliser l'IA seulement pour des cas intéressants
    return (
      summary.productsFound >= 2 && // Au moins 2 produits trouvés
      summary.totalProducts >= 2 && // Liste significative
      (Math.abs(summary.priceDifference) >= 0.5 || // Différence notable
       summary.productsFound < summary.totalProducts) // Produits manquants
    );
  }

  private static createAnalysisPrompt(dbData: any, userProducts: string[]): string {
    const { summary, detailedComparison } = dbData;

    return `Analyse ces données de shopping pour aider un utilisateur à choisir entre IGA et Metro:

CONTEXTE:
- Produits recherchés: ${userProducts.join(', ')}
- Total IGA: $${(summary.totalIga || 0).toFixed(2)}
- Total Metro: $${(summary.totalMetro || 0).toFixed(2)}
- Économie potentielle: $${(summary.totalSavings || 0).toFixed(2)}
- Situation: ${this.getSituationContext(dbData)}

DONNÉES RÉELLES:
${this.formatDataForAI(summary, detailedComparison)}

Génère une analyse UTILE qui:
1. Résume la situation en 1 phrase
2. Explique le meilleur choix avec les chiffres exacts
3. Donne 1-2 conseils pratiques spécifiques
4. Mentionne les limitations (produits manquants, etc.)

Sois direct et utile, pas trop formel.`;
  }

  private static getSituationContext(dbData: any): string {
    const { summary } = dbData;
    
    if (!summary || summary.productsFound === 0) return "Aucun produit trouvé";
    if (summary.productsFound < summary.totalProducts) return `${summary.totalProducts - summary.productsFound} produit(s) manquant(s)`;
    if (Math.abs(summary.priceDifference || 0) < 0.5) return "Prix très similaires";
    if ((summary.totalSavings || 0) > 5) return "Économies importantes possibles";
    if (summary.bestStore === "Égalité") return "Prix identiques dans les deux magasins";
    
    return "Comparaison standard avec économies";
  }

  private static formatDataForAI(summary: any, detailedComparison: any[]): string {
    if (!summary) return "Aucune donnée disponible";
    
    let data = `TOTAUX COMPARÉS:
• IGA: $${(summary.totalIga || 0).toFixed(2)} (${summary.productsFoundIga || 0}/${summary.totalProducts} produits)
• Metro: $${(summary.totalMetro || 0).toFixed(2)} (${summary.productsFoundMetro || 0}/${summary.totalProducts} produits)
• Meilleur choix: ${summary.bestStore}
• Économie: $${(summary.totalSavings || 0).toFixed(2)} (${summary.savingsPercentage || 0}%)

DÉTAIL DES PRODUITS:`;

    (detailedComparison || []).forEach((item, index) => {
      data += `\n${index + 1}. ${item.product}: `;
      
      if (item.bestStore) {
        data += `Meilleur prix: $${(item.bestPrice || 0).toFixed(2)} chez ${item.bestStore}`;
        if ((item.savings || 0) > 0) data += ` (Économie: $${(item.savings || 0).toFixed(2)})`;
      } else {
        data += `Non trouvé dans les deux magasins`;
      }
    });

    // Ajouter les produits manquants
    const missingProducts = summary.totalProducts - summary.productsFound;
    if (missingProducts > 0) {
      data += `\n\n⚠️  ${missingProducts} produit(s) non trouvé(s) - vérifiez les circulaires`;
    }

    return data;
  }

  private static isValidResponse(response: string): boolean {
    return Boolean(
      response && 
      response.length > 30 && 
      !response.includes('```') &&
      !response.includes('En tant qu\'IA')
    );
  }

  private static generateSimpleAnalysis(dbData: any): string {
    const { summary } = dbData;
    
    if (!summary || summary.productsFound === 0) {
      return "🔍 Aucun produit trouvé dans les deux supermarchés. Essayez avec des termes plus génériques ou vérifiez les circulaires directement.";
    }

    if (summary.bestStore === "Égalité") {
      return `⚖️ **Prix identiques à $${(summary.totalIga || 0).toFixed(2)}**
• Produits trouvés: ${summary.productsFound}/${summary.totalProducts}
• Choix basé sur: Préférence personnelle ou proximité
💡 Conseil: Vérifiez les promotions exclusives en magasin ou les programmes de fidélité.`;
    }

    const savingsText = summary.totalSavings > 0 ? 
      `• Économie: $${summary.totalSavings.toFixed(2)} (${summary.savingsPercentage}%)` : 
      '• Différence minime';

    return `🛒 **Meilleur choix: ${summary.bestStore}**
${savingsText}
• Total: $${(summary.bestStore === "IGA" ? summary.totalIga : summary.totalMetro).toFixed(2)}
• Produits trouvés: ${summary.productsFound}/${summary.totalProducts}
💡 Conseil: ${summary.bestStore} offre le meilleur prix pour votre panier actuel.`;
  }
}