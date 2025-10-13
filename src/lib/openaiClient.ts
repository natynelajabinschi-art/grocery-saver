// lib/aiPriceService.ts
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
            - Utilise des émojis pour rendre ça vivant`
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
    
    // Utiliser l'IA seulement pour des cas intéressants
    return (
      summary.productsFound >= 2 && // Au moins 2 produits
      summary.totalProducts >= 3 && // Liste significative
      (summary.priceDifference < 2 || // Petite différence → besoin d'analyse
       summary.productsFound < summary.totalProducts) // Produits manquants
    );
  }

  private static createAnalysisPrompt(dbData: any, userProducts: string[]): string {
    const { summary, detailedComparison } = dbData;

    return `Analyse ces données de shopping pour aider un utilisateur à choisir entre IGA et Metro:

CONTEXTE:
- Produits recherchés: ${userProducts.join(', ')}
- Budget total: $${(summary.totalIga + summary.totalMetro).toFixed(2)}
- Situation: ${this.getSituationContext(dbData)}

DONNÉES RÉELLES:
${this.formatDataForAI(summary, detailedComparison)}

Génère une analyse UTILE qui:
1. Résume la situation en 1 phrase
2. Explique le meilleur choix avec les chiffres
3. Donne 1 conseil pratique spécifique
4. Mentionne les limites (produits manquants, etc.)

Sois direct et utile, pas trop formel.`;
  }

  private static getSituationContext(dbData: any): string {
    const { summary } = dbData;
    
    if (summary.productsFound === 0) return "Aucune promotion trouvée";
    if (summary.priceDifference < 0.5) return "Prix très similaires";
    if (summary.productsFound < summary.totalProducts) return "Certains produits manquent";
    if (summary.totalSavings > 5) return "Économies importantes possibles";
    
    return "Comparaison standard";
  }

  private static formatDataForAI(summary: any, detailedComparison: any[]): string {
    let data = `TOTAUX:
• IGA: $${summary.totalIga.toFixed(2)} (${summary.productsFoundIga} produit${summary.productsFoundIga > 1 ? 's' : ''})
• Metro: $${summary.totalMetro.toFixed(2)} (${summary.productsFoundMetro} produit${summary.productsFoundMetro > 1 ? 's' : ''})
• Économie: $${summary.totalSavings.toFixed(2)}
• Produits trouvés: ${summary.productsFound}/${summary.totalProducts}

DÉTAIL:`;

    detailedComparison.forEach(item => {
      data += `\n• ${item.product}: `;
      
      if (item.bestStore) {
        data += `$${item.bestPrice?.toFixed(2)} chez ${item.bestStore}`;
        if (item.savings > 0) data += ` (Économie: $${item.savings.toFixed(2)})`;
        if ((item.bestStore === "IGA" && item.iga?.hasPromotion) || 
            (item.bestStore === "Metro" && item.metro?.hasPromotion)) {
          data += ` 🏷️ PROMO`;
        }
      } else {
        data += `Non trouvé`;
      }
    });

    return data;
  }

  private static isValidResponse(response: string): boolean {
    // Vérifier que la réponse n'est pas vide ou corrompue
    return response && response.length > 50 && !response.includes('```');
  }

  private static generateSimpleAnalysis(dbData: any): string {
    const { summary } = dbData;
    
    if (summary.productsFound === 0) {
      return "🔍 Aucune promotion trouvée pour ces produits. Essayez avec des termes plus génériques ou vérifiez les circulaires directement.";
    }

    return `🛒 **Meilleur choix: ${summary.bestStore}**
• Économie: $${summary.totalSavings.toFixed(2)}
• Produits en promo: ${summary.productsFound}/${summary.totalProducts}
💡 Conseil: ${summary.bestStore} offre le meilleur rapport qualité-prix pour votre panier.`;
  }
}