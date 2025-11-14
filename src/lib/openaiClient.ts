// lib/openaiClient.ts - VERSION COMPLÈTE OPTIMISÉE
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const AI_CONFIG = {
  model: "gpt-3.5-turbo",
  temperature: 0.4,
  maxTokens: 500,
  minProductsForAI: 2,
  minSavingsForAI: 0.5
};

export class AIPriceService {
  static async generateSmartAnalysis(comparisonData: any, userProducts: string[]): Promise<string> {
    console.log(`\n🤖 === ANALYSE IA ===`);

    try {
      if (!this.shouldUseAI(comparisonData)) {
        console.log("   ⚡ Utilisation de l'analyse simple");
        return this.generateSimpleAnalysis(comparisonData);
      }

      console.log("   🔮 Génération de l'analyse IA...");

      const completion = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          { role: "system", content: this.getSystemPrompt() },
          { role: "user", content: this.createAnalysisPrompt(comparisonData, userProducts) }
        ],
        temperature: AI_CONFIG.temperature,
        max_tokens: AI_CONFIG.maxTokens
      });

      const aiResponse = completion.choices[0]?.message?.content;

      if (aiResponse && this.isValidResponse(aiResponse)) {
        console.log("   ✅ Analyse IA générée avec succès");
        return aiResponse;
      }

      throw new Error('Réponse IA invalide');
    } catch (error) {
      console.error('   ❌ Erreur OpenAI:', error);
      console.log("   ⚡ Utilisation de l'analyse de secours");
      return this.generateSimpleAnalysis(comparisonData);
    }
  }

  private static getSystemPrompt(): string {
    return `Tu es un expert en shopping intelligent au Québec, spécialisé dans la comparaison de prix entre Walmart, Metro et Super C.

RÈGLES IMPORTANTES:
- Sois concis et pratique (maximum 12 lignes)
- Utilise UNIQUEMENT les données fournies
- Explique POURQUOI un magasin est recommandé (nombre de promos, prix total promos, prix total)
- Structure: Meilleur choix → Raison → Économies → Conseil
- Utilise des émojis pour rendre ça vivant
- Mentionne les produits manquants si nécessaire
- Parle en français québécois
- Sois direct et utile, pas trop formel`;
  }

  private static createAnalysisPrompt(comparisonData: any, userProducts: string[]): string {
    const { summary } = comparisonData;

    return `Analyse ces données de shopping pour un utilisateur québécois:

CONTEXTE:
- Produits recherchés: ${userProducts.join(', ')}

TOTAUX:
- Walmart: $${(summary.totalWalmart || 0).toFixed(2)} (${summary.promotionsFoundWalmart} promos)
- Metro: $${(summary.totalMetro || 0).toFixed(2)} (${summary.promotionsFoundMetro} promos)
- Super C: $${(summary.totalSuperC || 0).toFixed(2)} (${summary.promotionsFoundSuperC} promos)

MEILLEUR CHOIX: ${summary.bestStore}
RAISON: ${summary.bestStoreReason}

PRODUITS TROUVÉS: ${summary.productsFound}/${summary.totalProducts}
ÉCONOMIE VS PRIX RÉGULIERS: $${(summary.totalPromotionalSavings || 0).toFixed(2)}

${this.formatDataForAI(summary, comparisonData.comparisons)}

Génère une analyse PRATIQUE qui:
1. Confirme le meilleur choix avec la raison exacte fournie
2. Explique les économies concrètes
3. Donne 1-2 conseils pratiques spécifiques


Sois direct, clair et utile.`;
  }

  private static formatDataForAI(summary: any, comparisons: any[]): string {
    if (!summary) return "Aucune donnée disponible";

    let data = `DÉTAIL DES PRODUITS EN PROMOTION:\n`;

    const productsWithPromos = comparisons.filter((c: any) => c.hasPromotion).slice(0, 5);
    
    if (productsWithPromos.length === 0) {
      data += `Aucun produit actuellement en promotion.`;
    } else {
      productsWithPromos.forEach((item: any, index: number) => {
        data += `\n${index + 1}. Recherche: "${item.originalProduct}"\n`;
        
        if (item.walmart.hasPromotion) {
          data += `   • Walmart: "${item.walmart.productName}"\n`;
          data += `     Prix: ${item.walmart.price?.toFixed(2)} (rég. ${item.walmart.regularPrice?.toFixed(2)}) • Rabais: ${item.walmart.discount}%\n`;
        }
        if (item.metro.hasPromotion) {
          data += `   • Metro: "${item.metro.productName}"\n`;
          data += `     Prix: ${item.metro.price?.toFixed(2)} (rég. ${item.metro.regularPrice?.toFixed(2)}) • Rabais: ${item.metro.discount}%\n`;
        }
        if (item.superc.hasPromotion) {
          data += `   • Super C: "${item.superc.productName}"\n`;
          data += `     Prix: ${item.superc.price?.toFixed(2)} (rég. ${item.superc.regularPrice?.toFixed(2)}) • Rabais: ${item.superc.discount}%\n`;
        }
      });
    }

    const missingProducts = summary.totalProducts - summary.productsFound;
    if (missingProducts > 0) {
      data += `\n\n⚠️ ${missingProducts} produit(s) non trouvé(s) dans les circulaires actuelles`;
    }

    return data;
  }

  private static shouldUseAI(comparisonData: any): boolean {
    const { summary } = comparisonData;
    if (!summary) return false;
    return (
      summary.productsFound >= AI_CONFIG.minProductsForAI &&
      summary.totalProducts >= AI_CONFIG.minProductsForAI
    );
  }

  private static isValidResponse(response: string): boolean {
    return Boolean(
      response &&
      response.length > 30 &&
      !response.includes('```') &&
      !response.includes('En tant qu\'IA') &&
      !response.includes('Je ne peux pas')
    );
  }

  private static generateSimpleAnalysis(comparisonData: any): string {
    const { summary } = comparisonData;
    const totalPromos = summary.promotionsFoundWalmart + summary.promotionsFoundMetro + summary.promotionsFoundSuperC;

    // Cas 1: Aucun produit trouvé
    if (!summary || summary.productsFound === 0) {
      return `🔍 **Aucun produit trouvé dans les circulaires actuelles**

❌ Désolé, aucun de vos produits n'est disponible dans les promotions actuelles de Walmart, Metro ou Super C.

💡 **Suggestions :**
• Vérifiez les circulaires directement en magasin
• Essayez avec des termes plus génériques (ex: "lait" au lieu de "lait Natrel 2%")
• Les promotions changent chaque semaine

🛍️ **Astuce :** Créez une liste et relancez la comparaison la semaine prochaine !`;
    }

    // Cas 2: Prix égaux
    if (summary.bestStore === "Égalité") {
      return `⚖️ **Prix identiques dans tous les magasins**

${summary.bestStoreReason}

📊 **Totaux:**
• Walmart: $${summary.totalWalmart.toFixed(2)} (${summary.promotionsFoundWalmart} promo${summary.promotionsFoundWalmart > 1 ? 's' : ''})
• Metro: $${summary.totalMetro.toFixed(2)} (${summary.promotionsFoundMetro} promo${summary.promotionsFoundMetro > 1 ? 's' : ''})
• Super C: $${summary.totalSuperC.toFixed(2)} (${summary.promotionsFoundSuperC} promo${summary.promotionsFoundSuperC > 1 ? 's' : ''})

📦 Produits trouvés: ${summary.productsFound}/${summary.totalProducts || 0}

💡 **Conseil:** Choisissez selon votre proximité ou préférence personnelle. Les prix sont équivalents !`;
    }

    // Cas 3: Analyse standard avec meilleur choix
    const savingsText = summary.totalSavings > 0
      ? `💰 **Économie: ${summary.totalSavings.toFixed(2)}** (${summary.savingsPercentage.toFixed(1)}%)`
      : '• Différence minime';

    let result = `🏆 **Meilleur choix: ${summary.bestStore}**

📊 **Raison:** ${summary.bestStoreReason}

${savingsText}

**Comparaison complète:**
• Walmart: ${summary.totalWalmart.toFixed(2)} (${summary.promotionsFoundWalmart} promo${summary.promotionsFoundWalmart > 1 ? 's' : ''})
• Metro: ${summary.totalMetro.toFixed(2)} (${summary.promotionsFoundMetro} promo${summary.promotionsFoundMetro > 1 ? 's' : ''})
• Super C: ${summary.totalSuperC.toFixed(2)} (${summary.promotionsFoundSuperC} promo${summary.promotionsFoundSuperC > 1 ? 's' : ''})

📦 Produits trouvés: ${summary.productsFound}/${summary.totalProducts || 0}

${summary.totalPromotionalSavings > 0 ? `🎁 Économie vs prix régulier: ${summary.totalPromotionalSavings.toFixed(2)}\n\n` : ''}`;

    // Ajouter les détails des produits en promotion
    const productsWithPromos = comparisonData.comparisons.filter((c: any) => c.hasPromotion);
    if (productsWithPromos.length > 0) {
      result += `**🎁 Produits en promotion :**\n\n`;
      
      productsWithPromos.slice(0, 5).forEach((product: any, idx: number) => {
        result += `${idx + 1}. **${product.originalProduct}**\n`;
        
        if (product.walmart.hasPromotion) {
          result += `   • Walmart: ${product.walmart.productName}\n`;
          result += `     ${product.walmart.price?.toFixed(2)} (rég. ${product.walmart.regularPrice?.toFixed(2)}) • Rabais: ${product.walmart.discount}%\n`;
        }
        if (product.metro.hasPromotion) {
          result += `   • Metro: ${product.metro.productName}\n`;
          result += `     ${product.metro.price?.toFixed(2)} (rég. ${product.metro.regularPrice?.toFixed(2)}) • Rabais: ${product.metro.discount}%\n`;
        }
        if (product.superc.hasPromotion) {
          result += `   • Super C: ${product.superc.productName}\n`;
          result += `     ${product.superc.price?.toFixed(2)} (rég. ${product.superc.regularPrice?.toFixed(2)}) • Rabais: ${product.superc.discount}%\n`;
        }
        
        result += `\n`;
      });

      if (productsWithPromos.length > 5) {
        result += `... et ${productsWithPromos.length - 5} autre${productsWithPromos.length - 5 > 1 ? 's' : ''} produit${productsWithPromos.length - 5 > 1 ? 's' : ''} en promotion\n\n`;
      }
    }

    result += `💡 **Conseil:** Faites vos courses chez ${summary.bestStore} pour maximiser vos économies !

📅 **Validité:** Vérifiez les dates d'expiration dans les circulaires (généralement valide 7 jours).`;

    return result;
  }
}