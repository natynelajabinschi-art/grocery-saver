// lib/openaiClient.ts
/**
 * Service d'analyse intelligente avec OpenAI
 * Génère des recommandations personnalisées
 */

import OpenAI from 'openai';

// ========================================
// CONFIGURATION
// ========================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const AI_CONFIG = {
  model: "gpt-3.5-turbo",
  temperature: 0.4,
  maxTokens: 400,
  minProductsForAI: 2,
  minSavingsForAI: 0.5
};

// ========================================
// SERVICE PRINCIPAL
// ========================================

export class AIPriceService {
  /**
   * Génère une analyse intelligente des prix
   * @param comparisonData - Données de comparaison des prix
   * @param userProducts - Liste des produits recherchés
   * @returns Analyse textuelle
   */
  static async generateSmartAnalysis(
    comparisonData: any,
    userProducts: string[]
  ): Promise<string> {
    console.log(`\n🤖 === ANALYSE IA ===`);

    try {
      // Vérifier si l'IA doit être utilisée
      if (!this.shouldUseAI(comparisonData)) {
        console.log("   ⚡ Utilisation de l'analyse simple (pas assez de données)");
        return this.generateSimpleAnalysis(comparisonData);
      }

      console.log("   🔮 Génération de l'analyse IA...");

      // Appel à l'API OpenAI
      const completion = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt()
          },
          {
            role: "user",
            content: this.createAnalysisPrompt(comparisonData, userProducts)
          }
        ],
        temperature: AI_CONFIG.temperature,
        max_tokens: AI_CONFIG.maxTokens
      });

      const aiResponse = completion.choices[0]?.message?.content;

      // Valider la réponse
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

  // ========================================
  // SYSTÈME PROMPT
  // ========================================

  /**
   * Retourne le prompt système pour l'IA
   */
  private static getSystemPrompt(): string {
    return `Tu es un expert en shopping intelligent au Québec, spécialisé dans la comparaison de prix entre Walmart, Metro et Super C.

RÈGLES IMPORTANTES:
- Sois concis et pratique (maximum 10 lignes)
- Utilise UNIQUEMENT les données fournies, n'invente rien
- Donne des conseils spécifiques pour économiser
- Structure: Résumé → Analyse → Recommandation
- Utilise des émojis pour rendre ça vivant
- Mentionne les produits manquants si nécessaire
- Compare les 3 magasins: Walmart, Metro, Super C
- Parle en français québécois
- Sois direct et utile, pas trop formel`;
  }

  // ========================================
  // PROMPT DE REQUÊTE
  // ========================================

  /**
   * Crée le prompt de requête avec les données de comparaison
   */
  private static createAnalysisPrompt(
    comparisonData: any,
    userProducts: string[]
  ): string {
    const { summary } = comparisonData;

    return `Analyse ces données de shopping pour aider un utilisateur à choisir entre Walmart, Metro et Super C:

CONTEXTE:
- Produits recherchés: ${userProducts.join(', ')}
- Total Walmart: $${(summary.totalWalmart || 0).toFixed(2)} (${summary.productsFoundWalmart || 0} produits)
- Total Metro: $${(summary.totalMetro || 0).toFixed(2)} (${summary.productsFoundMetro || 0} produits)
- Total Super C: $${(summary.totalSuperC || 0).toFixed(2)} (${summary.productsFoundSuperC || 0} produits)
- Économie potentielle: $${(summary.totalSavings || 0).toFixed(2)}
- Situation: ${this.getSituationContext(summary)}

DONNÉES DÉTAILLÉES:
${this.formatDataForAI(summary, comparisonData.comparisons)}

Génère une analyse UTILE qui:
1. Résume la situation en 1-2 phrases
2. Explique le meilleur choix avec les chiffres exacts
3. Donne 1-2 conseils pratiques spécifiques
4. Mentionne les limitations (produits manquants, etc.)

Sois direct et utile, pas trop formel.`;
  }

  // ========================================
  // FORMATAGE DES DONNÉES
  // ========================================

  /**
   * Détermine le contexte de la situation
   */
  private static getSituationContext(summary: any): string {
    if (!summary || summary.productsFound === 0) {
      return "Aucun produit trouvé";
    }
    if (summary.productsFound < summary.totalProducts) {
      return `${summary.totalProducts - summary.productsFound} produit(s) manquant(s)`;
    }
    if (Math.abs(summary.totalSavings || 0) < 0.5) {
      return "Prix très similaires";
    }
    if ((summary.totalSavings || 0) > 5) {
      return "Économies importantes possibles";
    }
    if (summary.bestStore === "Égalité") {
      return "Prix identiques dans tous les magasins";
    }

    return "Comparaison standard avec économies";
  }

  /**
   * Formate les données pour l'IA
   */
  private static formatDataForAI(summary: any, comparisons: any[]): string {
    if (!summary) return "Aucune donnée disponible";

    let data = `TOTAUX COMPARÉS:
• Walmart: $${(summary.totalWalmart || 0).toFixed(2)} (${summary.productsFoundWalmart || 0}/${summary.totalProducts} produits)
• Metro: $${(summary.totalMetro || 0).toFixed(2)} (${summary.productsFoundMetro || 0}/${summary.totalProducts} produits)
• Super C: $${(summary.totalSuperC || 0).toFixed(2)} (${summary.productsFoundSuperC || 0}/${summary.totalProducts} produits)
• Meilleur choix: ${summary.bestStore}
• Économie: $${(summary.totalSavings || 0).toFixed(2)} (${(summary.savingsPercentage || 0).toFixed(1)}%)

DÉTAIL DES PRODUITS:`;

    // Ajouter les 5 premiers produits avec le plus d'économies
    const sortedComparisons = (comparisons || [])
      .sort((a, b) => (b.savings || 0) - (a.savings || 0))
      .slice(0, 5);

    sortedComparisons.forEach((item, index) => {
      data += `\n${index + 1}. ${item.product}: `;

      if (item.bestStore) {
        data += `Meilleur prix: $${(item.bestPrice || 0).toFixed(2)} chez ${item.bestStore}`;
        if ((item.savings || 0) > 0) {
          data += ` (Économie: $${(item.savings || 0).toFixed(2)})`;
        }
      } else {
        data += `Non trouvé dans les circulaires`;
      }
    });

    const missingProducts = summary.totalProducts - summary.productsFound;
    if (missingProducts > 0) {
      data += `\n\n⚠️ ${missingProducts} produit(s) non trouvé(s) - vérifiez les circulaires directement`;
    }

    return data;
  }

  // ========================================
  // VALIDATION
  // ========================================

  /**
   * Vérifie si l'IA doit être utilisée
   */
  private static shouldUseAI(comparisonData: any): boolean {
    const { summary } = comparisonData;

    if (!summary) return false;

    return (
      summary.productsFound >= AI_CONFIG.minProductsForAI &&
      summary.totalProducts >= AI_CONFIG.minProductsForAI &&
      (Math.abs(summary.totalSavings || 0) >= AI_CONFIG.minSavingsForAI ||
        summary.productsFound < summary.totalProducts)
    );
  }

  /**
   * Valide la réponse de l'IA
   */
  private static isValidResponse(response: string): boolean {
    return Boolean(
      response &&
      response.length > 30 &&
      !response.includes('```') &&
      !response.includes('En tant qu\'IA') &&
      !response.includes('Je ne peux pas')
    );
  }

  // ========================================
  // ANALYSE SIMPLE (FALLBACK)
  // ========================================

  /**
   * Génère une analyse simple sans IA
   */
  private static generateSimpleAnalysis(comparisonData: any): string {
    const { summary } = comparisonData;

    // Cas 1: Aucun produit trouvé
    if (!summary || summary.productsFound === 0) {
      return `🔍 **Aucun produit trouvé dans les circulaires actuelles**

💡 **Suggestions:**
• Utilisez des termes plus simples (ex: "lait" au lieu de "lait 2%")
• Vérifiez l'orthographe des produits
• Les promotions changent chaque semaine
• Essayez des synonymes (ex: "fromage" pour "cheddar")`;
    }

    // Cas 2: Prix égaux
    if (summary.bestStore === "Égalité") {
      return `⚖️ **Prix similaires dans tous les magasins**

📊 **Totaux:**
• Walmart: $${summary.totalWalmart.toFixed(2)} (${summary.productsFoundWalmart} produits)
• Metro: $${summary.totalMetro.toFixed(2)} (${summary.productsFoundMetro} produits)
• Super C: $${summary.totalSuperC.toFixed(2)} (${summary.productsFoundSuperC} produits)
• Produits trouvés: ${summary.productsFound}/${summary.totalProducts}

💡 **Conseil:** Choisissez selon votre proximité ou préférence personnelle.`;
    }

    // Cas 3: Analyse standard
    const savingsText =
      summary.totalSavings > 0
        ? `• Économie: $${summary.totalSavings.toFixed(2)} (${summary.savingsPercentage.toFixed(1)}%)`
        : '• Différence minime';

    const bestTotal =
      summary.bestStore === "Walmart"
        ? summary.totalWalmart
        : summary.bestStore === "Metro"
        ? summary.totalMetro
        : summary.totalSuperC;

    return `🛒 **Meilleur choix: ${summary.bestStore}**

${savingsText}
• Total: $${bestTotal.toFixed(2)}

📊 **Comparaison:**
• Walmart: $${summary.totalWalmart.toFixed(2)} (${summary.productsFoundWalmart} produits)
• Metro: $${summary.totalMetro.toFixed(2)} (${summary.productsFoundMetro} produits)
• Super C: $${summary.totalSuperC.toFixed(2)} (${summary.productsFoundSuperC} produits)
• Produits trouvés: ${summary.productsFound}/${summary.totalProducts}

💡 **Conseil:** ${summary.bestStore} offre le meilleur prix pour votre panier actuel.`;
  }
}