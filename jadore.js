/**
 * Copyright (c) 2026 Nico Hendriks — TVA BE0538.631.496
 * Tous droits réservés / All rights reserved.
 * Voir le fichier LICENSE pour plus de détails.
 *
 * Jadore - Conciergerie Saisonnière
 *
 * Logique de calcul :
 * - Prix en poche = ce que le propriétaire reçoit (ménage inclus)
 * - Ménage TVAC = heures × tarif HTVA × 1.21
 * - Loyer = Prix en poche - Ménage TVAC
 * - Frais de gestion TVAC = Loyer × fraisGestion% × 1.21
 * - Vous gagnerez = Prix en poche - (Frais de gestion TVAC + Ménage TVAC)
 */

// État de l'application
let jadoreState = {
  nomGite: '',
  heuresMenage: 5,
  tarifMenageHTVA: 35,
  fraisGestionPourcent: 18,
  tauxRemplissage: 65,
  prixPoche: {
    bs: { weekend: 1500, longweekend: 1800, midweek: 1500, semaine: 2500 },
    ms: { weekend: 1800, longweekend: 2200, midweek: 1600, semaine: 3000 },
    hs: { weekend: 2000, longweekend: 2500, midweek: 2000, semaine: 3500 }
  },
  resultats: null
};

// Noms lisibles
const SAISONS = {
  bs: 'Basse Saison',
  ms: 'Moyenne Saison',
  hs: 'Haute Saison'
};

const TYPES_SEJOUR = {
  weekend: 'Week-end',
  midweek: 'Midweek',
  semaine: 'Semaine'
};

const TVA = 0.21;

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initializeEventListeners();
  calculer();
});

// Charger depuis le localStorage
function loadFromStorage() {
  const saved = localStorage.getItem('jadorePricingState');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      jadoreState = { ...jadoreState, ...data };

      // Charger les réglages avancés
      if (data.joursSaison) {
        JOURS_PAR_SAISON = { ...JOURS_PAR_SAISON_DEFAULT, ...data.joursSaison };
      }
      if (data.weekendsSaison) {
        WEEKENDS_PAR_SAISON = { ...WEEKENDS_PAR_SAISON_DEFAULT, ...data.weekendsSaison };
      }
      if (data.tauxBase) {
        ['hs', 'ms', 'bs'].forEach(s => {
          if (data.tauxBase[s]) {
            TAUX_BASE[s] = { ...TAUX_BASE_DEFAULT[s], ...data.tauxBase[s] };
          }
        });
      }

      updateFormFromState();
      updateAdvancedFromState();
    } catch (e) {
      console.error('Erreur lors du chargement des données:', e);
    }
  }
}

// Sauvegarder dans le localStorage
function saveToStorage() {
  localStorage.setItem('jadorePricingState', JSON.stringify({
    nomGite: jadoreState.nomGite,
    heuresMenage: jadoreState.heuresMenage,
    tarifMenageHTVA: jadoreState.tarifMenageHTVA,
    fraisGestionPourcent: jadoreState.fraisGestionPourcent,
    tauxRemplissage: jadoreState.tauxRemplissage,
    prixPoche: jadoreState.prixPoche,
    joursSaison: JOURS_PAR_SAISON,
    weekendsSaison: WEEKENDS_PAR_SAISON,
    tauxBase: TAUX_BASE
  }));
}

// Mettre à jour le formulaire depuis l'état
function updateFormFromState() {
  document.getElementById('jadore-nom-gite').value = jadoreState.nomGite || '';
  document.getElementById('jadore-heures-menage').value = jadoreState.heuresMenage;
  document.getElementById('jadore-tarif-menage').value = jadoreState.tarifMenageHTVA;
  document.getElementById('jadore-frais-gestion').value = jadoreState.fraisGestionPourcent;
  document.getElementById('jadore-taux-remplissage').value = jadoreState.tauxRemplissage;
  document.getElementById('jadore-taux-remplissage-input').value = jadoreState.tauxRemplissage;

  ['bs', 'ms', 'hs'].forEach(saison => {
    document.getElementById(`jadore-${saison}-weekend`).value = jadoreState.prixPoche[saison].weekend;
    document.getElementById(`jadore-${saison}-longweekend`).value = jadoreState.prixPoche[saison].longweekend;
    document.getElementById(`jadore-${saison}-midweek`).value = jadoreState.prixPoche[saison].midweek;
    document.getElementById(`jadore-${saison}-semaine`).value = jadoreState.prixPoche[saison].semaine;
  });

  updateMenageTVAC();
}

// Lire les valeurs du formulaire
function readFormValues() {
  jadoreState.nomGite = document.getElementById('jadore-nom-gite').value.trim();
  jadoreState.heuresMenage = parseFloat(document.getElementById('jadore-heures-menage').value) || 0;
  jadoreState.tarifMenageHTVA = parseFloat(document.getElementById('jadore-tarif-menage').value) || 0;
  jadoreState.fraisGestionPourcent = parseFloat(document.getElementById('jadore-frais-gestion').value) || 0;
  jadoreState.tauxRemplissage = parseFloat(document.getElementById('jadore-taux-remplissage').value) || 65;

  ['bs', 'ms', 'hs'].forEach(saison => {
    jadoreState.prixPoche[saison].weekend = parseFloat(document.getElementById(`jadore-${saison}-weekend`).value) || 0;
    jadoreState.prixPoche[saison].longweekend = parseFloat(document.getElementById(`jadore-${saison}-longweekend`).value) || 0;
    jadoreState.prixPoche[saison].midweek = parseFloat(document.getElementById(`jadore-${saison}-midweek`).value) || 0;
    jadoreState.prixPoche[saison].semaine = parseFloat(document.getElementById(`jadore-${saison}-semaine`).value) || 0;
  });
}

// Mettre à jour l'affichage du ménage TVAC
function updateMenageTVAC() {
  const menageTVAC = calculerMenageTVAC();
  document.getElementById('jadore-menage-tvac').textContent = formatPrix2Decimales(menageTVAC);
}

// Calculer le ménage TVAC
function calculerMenageTVAC() {
  return jadoreState.heuresMenage * jadoreState.tarifMenageHTVA * (1 + TVA);
}

// Initialiser les écouteurs d'événements
function initializeEventListeners() {
  // Bouton calculer
  document.getElementById('jadore-btn-calculer').addEventListener('click', () => {
    readFormValues();
    saveToStorage();
    calculer();
  });

  // Bouton réinitialiser
  document.getElementById('jadore-btn-reset').addEventListener('click', resetToDefaults);

  // Bouton synchroniser
  document.getElementById('jadore-btn-sync').addEventListener('click', syncToGitePricing);

  // Boutons d'export
  document.getElementById('jadore-btn-copy').addEventListener('click', copyToClipboard);
  document.getElementById('jadore-btn-print').addEventListener('click', () => window.print());

  // Champs ménage (mise à jour en temps réel)
  ['jadore-heures-menage', 'jadore-tarif-menage'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      readFormValues();
      updateMenageTVAC();
    });
    document.getElementById(id).addEventListener('change', () => {
      readFormValues();
      saveToStorage();
      calculer();
    });
  });

  // Écouteurs pour les champs de prix
  ['bs', 'ms', 'hs'].forEach(saison => {
    ['weekend', 'longweekend', 'midweek', 'semaine'].forEach(type => {
      document.getElementById(`jadore-${saison}-${type}`).addEventListener('change', () => {
        readFormValues();
        saveToStorage();
        calculer();
      });
    });
  });

  // Slider taux de remplissage
  const slider = document.getElementById('jadore-taux-remplissage');
  const sliderInput = document.getElementById('jadore-taux-remplissage-input');
  slider.addEventListener('input', () => {
    sliderInput.value = slider.value;
    jadoreState.tauxRemplissage = parseFloat(slider.value);
    calculerEstimation();
  });
  slider.addEventListener('change', () => {
    readFormValues();
    saveToStorage();
    calculerEstimation();
  });
  sliderInput.addEventListener('input', () => {
    let val = Math.min(98, Math.max(20, parseFloat(sliderInput.value) || 20));
    slider.value = val;
    jadoreState.tauxRemplissage = val;
    calculerEstimation();
  });
  sliderInput.addEventListener('change', () => {
    let val = Math.min(98, Math.max(20, parseFloat(sliderInput.value) || 20));
    sliderInput.value = val;
    slider.value = val;
    jadoreState.tauxRemplissage = val;
    saveToStorage();
    calculerEstimation();
  });

  // Frais de gestion et nom
  ['jadore-frais-gestion', 'jadore-nom-gite'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      readFormValues();
      saveToStorage();
      calculer();
    });
  });

  // Bouton réglages avancés (toggle)
  const advBtn = document.getElementById('jadore-btn-advanced');
  const advPanel = document.getElementById('jadore-advanced-panel');
  advBtn.addEventListener('click', () => {
    const visible = advPanel.style.display !== 'none';
    advPanel.style.display = visible ? 'none' : 'block';
    advBtn.classList.toggle('active', !visible);
  });

  // Écouteurs réglages avancés — calendrier
  ['hs', 'ms', 'bs'].forEach(s => {
    document.getElementById(`jadore-adv-jours-${s}`).addEventListener('change', () => {
      readAdvancedValues();
      saveToStorage();
      calculer();
    });
    document.getElementById(`jadore-adv-we-${s}`).addEventListener('change', () => {
      readAdvancedValues();
      saveToStorage();
      calculer();
    });
    // Écouteurs réglages avancés — taux de base
    ['semaine', 'weekend', 'midweek'].forEach(t => {
      document.getElementById(`jadore-adv-taux-${s}-${t}`).addEventListener('change', () => {
        readAdvancedValues();
        saveToStorage();
        calculer();
      });
    });
  });
}

// Lire les réglages avancés depuis le formulaire
function readAdvancedValues() {
  ['hs', 'ms', 'bs'].forEach(s => {
    JOURS_PAR_SAISON[s] = parseInt(document.getElementById(`jadore-adv-jours-${s}`).value) || JOURS_PAR_SAISON_DEFAULT[s];
    WEEKENDS_PAR_SAISON[s] = parseInt(document.getElementById(`jadore-adv-we-${s}`).value) || WEEKENDS_PAR_SAISON_DEFAULT[s];
    TAUX_BASE[s].semaine = (parseFloat(document.getElementById(`jadore-adv-taux-${s}-semaine`).value) || 0) / 100;
    TAUX_BASE[s].weekend = (parseFloat(document.getElementById(`jadore-adv-taux-${s}-weekend`).value) || 0) / 100;
    TAUX_BASE[s].midweek = (parseFloat(document.getElementById(`jadore-adv-taux-${s}-midweek`).value) || 0) / 100;
  });
  updateAdvancedTotals();
}

// Mettre à jour les inputs avancés depuis l'état
function updateAdvancedFromState() {
  ['hs', 'ms', 'bs'].forEach(s => {
    document.getElementById(`jadore-adv-jours-${s}`).value = JOURS_PAR_SAISON[s];
    document.getElementById(`jadore-adv-we-${s}`).value = WEEKENDS_PAR_SAISON[s];
    document.getElementById(`jadore-adv-taux-${s}-semaine`).value = Math.round(TAUX_BASE[s].semaine * 100);
    document.getElementById(`jadore-adv-taux-${s}-weekend`).value = Math.round(TAUX_BASE[s].weekend * 100);
    document.getElementById(`jadore-adv-taux-${s}-midweek`).value = Math.round(TAUX_BASE[s].midweek * 100);
  });
  updateAdvancedTotals();
}

// Mettre à jour les totaux et warnings du panneau avancé
function updateAdvancedTotals() {
  const totalJours = JOURS_PAR_SAISON.hs + JOURS_PAR_SAISON.ms + JOURS_PAR_SAISON.bs;
  const totalWE = WEEKENDS_PAR_SAISON.hs + WEEKENDS_PAR_SAISON.ms + WEEKENDS_PAR_SAISON.bs;

  document.getElementById('jadore-adv-total-jours').textContent = totalJours;
  document.getElementById('jadore-adv-total-we').textContent = totalWE;

  const warnJours = document.getElementById('jadore-adv-warning-jours');
  const warnWE = document.getElementById('jadore-adv-warning-we');
  warnJours.style.display = totalJours !== 365 ? 'block' : 'none';
  warnWE.style.display = totalWE !== 52 ? 'block' : 'none';
}

// Réinitialiser aux valeurs par défaut
function resetToDefaults() {
  jadoreState = {
    nomGite: '',
    heuresMenage: 5,
    tarifMenageHTVA: 35,
    fraisGestionPourcent: 18,
    tauxRemplissage: 65,
    prixPoche: {
      bs: { weekend: 1500, longweekend: 1800, midweek: 1500, semaine: 2500 },
      ms: { weekend: 1800, longweekend: 2200, midweek: 1600, semaine: 3000 },
      hs: { weekend: 2000, longweekend: 2500, midweek: 2000, semaine: 3500 }
    },
    resultats: null
  };

  // Réinitialiser les réglages avancés
  JOURS_PAR_SAISON = { ...JOURS_PAR_SAISON_DEFAULT };
  WEEKENDS_PAR_SAISON = { ...WEEKENDS_PAR_SAISON_DEFAULT };
  ['hs', 'ms', 'bs'].forEach(s => {
    TAUX_BASE[s] = { ...TAUX_BASE_DEFAULT[s] };
  });

  updateFormFromState();
  updateAdvancedFromState();
  saveToStorage();
  calculer();
}

// Formater un prix avec 2 décimales
function formatPrix2Decimales(prix) {
  return prix.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// Effectuer tous les calculs
function calculer() {
  const validations = validerPrix();
  afficherValidations(validations);
  updatePrintHeader();
  updateMenageTVAC();

  const menageTVAC = calculerMenageTVAC();
  const fraisGestionPct = jadoreState.fraisGestionPourcent / 100;
  const resultats = {};

  ['bs', 'ms', 'hs'].forEach(saison => {
    const prixPoche = jadoreState.prixPoche[saison];
    resultats[saison] = {};

    ['weekend', 'midweek', 'semaine'].forEach(type => {
      const prixEnPoche = prixPoche[type];
      const loyer = prixEnPoche - menageTVAC;
      const nousRecevons = prixEnPoche;
      const fraisGestionHTVA = loyer * fraisGestionPct;
      const fraisGestionTVAC = fraisGestionHTVA * (1 + TVA);
      const totalFraisTVAC = fraisGestionTVAC + menageTVAC;
      const vousGagnerez = nousRecevons - totalFraisTVAC;

      resultats[saison][type] = {
        loyer: loyer,
        menageTVAC: menageTVAC,
        nousRecevons: nousRecevons,
        fraisGestionTVAC: fraisGestionTVAC,
        totalFraisTVAC: totalFraisTVAC,
        vousGagnerez: vousGagnerez
      };
    });
  });

  jadoreState.resultats = resultats;
  afficherResultats();
  calculerEstimation();
}

// Mettre à jour le header d'impression
function updatePrintHeader() {
  const printHeader = document.getElementById('jadore-print-header');
  let html = '<img src="logo1.png" alt="Jadore" class="jadore-logo-print">';
  if (jadoreState.nomGite) {
    html += `<h2 class="print-gite-name">${jadoreState.nomGite}</h2>`;
  }
  html += `<p class="print-date">Généré le ${new Date().toLocaleDateString('fr-FR')}</p>`;
  printHeader.innerHTML = html;
}

// Valider la cohérence des prix
function validerPrix() {
  const messages = [];
  const menageTVAC = calculerMenageTVAC();

  ['bs', 'ms', 'hs'].forEach(saison => {
    const prix = jadoreState.prixPoche[saison];
    const nomSaison = SAISONS[saison];

    if (prix.weekend <= menageTVAC) {
      messages.push({
        type: 'error',
        text: `${nomSaison} : Le prix weekend (${prix.weekend}€) doit être supérieur au ménage TVAC (${formatPrix2Decimales(menageTVAC)}).`
      });
    }
  });

  if (jadoreState.prixPoche.ms.weekend < jadoreState.prixPoche.bs.weekend) {
    messages.push({
      type: 'warning',
      text: 'Le prix weekend Moyenne Saison est inférieur à celui de Basse Saison.'
    });
  }

  if (jadoreState.prixPoche.hs.weekend < jadoreState.prixPoche.ms.weekend) {
    messages.push({
      type: 'warning',
      text: 'Le prix weekend Haute Saison est inférieur à celui de Moyenne Saison.'
    });
  }

  if (messages.length === 0) {
    messages.push({
      type: 'success',
      text: 'Tous les prix sont cohérents.'
    });
  }

  return messages;
}

// Afficher les messages de validation
function afficherValidations(messages) {
  const container = document.getElementById('jadore-validation-messages');
  container.innerHTML = messages.map(msg => `
    <div class="validation-message validation-${msg.type}">
      ${msg.text}
    </div>
  `).join('');
}

// Afficher les résultats
function afficherResultats() {
  if (!jadoreState.resultats) return;

  const container = document.getElementById('jadore-resultats');
  let html = '';

  ['bs', 'ms', 'hs'].forEach(saison => {
    html += `<div class="jadore-saison-section">`;
    html += `<h3 class="jadore-saison-titre">${SAISONS[saison]}</h3>`;
    html += `<div class="jadore-blocs-row">`;

    ['weekend', 'midweek', 'semaine'].forEach(type => {
      const data = jadoreState.resultats[saison][type];
      html += genererBloc(TYPES_SEJOUR[type], data);
    });

    html += `</div>`;
    html += `</div>`;
  });

  container.innerHTML = html;
}

// Générer un bloc de résultat
function genererBloc(titre, data) {
  return `
    <div class="jadore-bloc">
      <h4 class="jadore-bloc-titre">${titre}</h4>
      <div class="jadore-bloc-contenu">
        <div class="jadore-ligne">
          <span class="jadore-label">Loyer</span>
          <span class="jadore-valeur">${formatPrix2Decimales(data.loyer)}</span>
        </div>
        <div class="jadore-ligne">
          <span class="jadore-label">Ménage</span>
          <span class="jadore-valeur">${formatPrix2Decimales(data.menageTVAC)}</span>
        </div>
        <div class="jadore-ligne jadore-ligne-total">
          <span class="jadore-label"><strong>Nous recevons</strong></span>
          <span class="jadore-valeur"><strong>${formatPrix2Decimales(data.nousRecevons)}</strong></span>
        </div>

        <div class="jadore-separateur"></div>

        <div class="jadore-ligne">
          <span class="jadore-label"><em>Frais de gestion</em></span>
          <span class="jadore-valeur">${formatPrix2Decimales(data.fraisGestionTVAC)}</span>
        </div>
        <div class="jadore-ligne">
          <span class="jadore-label"><em>Ménage</em></span>
          <span class="jadore-valeur">${formatPrix2Decimales(data.menageTVAC)}</span>
        </div>
        <div class="jadore-ligne jadore-ligne-total">
          <span class="jadore-label"><strong><em>Total TVAC</em></strong></span>
          <span class="jadore-valeur"><strong>${formatPrix2Decimales(data.totalFraisTVAC)}</strong></span>
        </div>

        <div class="jadore-separateur jadore-separateur-final"></div>

        <div class="jadore-ligne jadore-ligne-gain">
          <span class="jadore-label"><strong>Vous gagnerez</strong></span>
          <span class="jadore-valeur"><strong>${formatPrix2Decimales(data.vousGagnerez)}</strong></span>
        </div>
      </div>
    </div>
  `;
}

// Copier dans le presse-papier
function copyToClipboard() {
  const text = generateTextReport();
  navigator.clipboard.writeText(text).then(() => {
    alert('Données copiées dans le presse-papier !');
  }).catch(err => {
    console.error('Erreur lors de la copie:', err);
    alert('Erreur lors de la copie. Veuillez réessayer.');
  });
}

// ===================================
// ESTIMATION ANNUELLE DU CA
// ===================================

// Valeurs par défaut
const JOURS_PAR_SAISON_DEFAULT = { hs: 93, ms: 61, bs: 211 };
const WEEKENDS_PAR_SAISON_DEFAULT = { hs: 18, ms: 10, bs: 24 };
const TAUX_BASE_DEFAULT = {
  hs: { semaine: 0.15, weekend: 1.00, midweek: 0.80 },
  ms: { semaine: 0.15, weekend: 0.80, midweek: 0.30 },
  bs: { semaine: 0.05, weekend: 0.70, midweek: 0.20 }
};

// Données modifiables (initialisées depuis les défauts, surchargées par localStorage)
let JOURS_PAR_SAISON = { ...JOURS_PAR_SAISON_DEFAULT };
let WEEKENDS_PAR_SAISON = { ...WEEKENDS_PAR_SAISON_DEFAULT };
let TAUX_BASE = {
  hs: { ...TAUX_BASE_DEFAULT.hs },
  ms: { ...TAUX_BASE_DEFAULT.ms },
  bs: { ...TAUX_BASE_DEFAULT.bs }
};

// Plafonds pour les taux après scaling
const TAUX_PLAFOND = { semaine: 1.00, weekend: 1.00, midweek: 1.00 };

/**
 * Calcule les réservations par saison et type en fonction du taux cible.
 * Recherche binaire sur un facteur d'échelle appliqué aux taux de base.
 * Le facteur est unique et croissant → garantit la monotonie.
 */
function calculerRepartition(tauxCiblePct) {
  const totalJours = JOURS_PAR_SAISON.hs + JOURS_PAR_SAISON.ms + JOURS_PAR_SAISON.bs;
  const nuitsCibles = Math.round(totalJours * tauxCiblePct / 100);

  // Borne supérieure dynamique : 1 / plus petit taux de base (pour que tout puisse atteindre 100%)
  let minTaux = 1;
  ['hs', 'ms', 'bs'].forEach(s => {
    ['semaine', 'weekend', 'midweek'].forEach(t => {
      if (TAUX_BASE[s][t] > 0) minTaux = Math.min(minTaux, TAUX_BASE[s][t]);
    });
  });
  let lo = 0, hi = Math.ceil(1 / minTaux) + 2;
  let bestResult = null;
  let bestDiff = Infinity;

  for (let iter = 0; iter < 60; iter++) {
    const mid = (lo + hi) / 2;

    // Appliquer le facteur aux taux de base avec plafonds
    const tauxActuels = {};
    ['hs', 'ms', 'bs'].forEach(s => {
      tauxActuels[s] = {};
      ['semaine', 'weekend', 'midweek'].forEach(t => {
        tauxActuels[s][t] = Math.min(TAUX_BASE[s][t] * mid, TAUX_PLAFOND[t]);
      });
    });

    const result = simulerReservations(tauxActuels);
    const diff = result.totalNuits - nuitsCibles;

    // Garder le meilleur résultat (préférer >= cible si même écart)
    if (Math.abs(diff) < Math.abs(bestDiff) ||
        (Math.abs(diff) === Math.abs(bestDiff) && diff >= 0 && bestDiff < 0)) {
      bestResult = result;
      bestDiff = diff;
    }

    if (result.totalNuits < nuitsCibles) lo = mid;
    else if (result.totalNuits > nuitsCibles) hi = mid;
    else break;
  }

  return bestResult;
}

/**
 * Simule les réservations en respectant la logique de priorité :
 * 1. Semaines complètes (7n) → consomment 1 créneau WE
 * 2. Weekends (2n) dans les créneaux restants, capés par les jours restants
 * 3. Midweeks (4n) dans les jours restants
 *
 * Le nombre de créneaux par saison = nombre de weekends disponibles.
 * Contrainte : nuits par saison ≤ jours par saison.
 */
function simulerReservations(taux) {
  const repartition = {};
  let totalNuits = 0;

  ['hs', 'ms', 'bs'].forEach(saison => {
    const nbCreneaux = WEEKENDS_PAR_SAISON[saison];
    const joursSaison = JOURS_PAR_SAISON[saison];
    const t = taux[saison];

    // 1. Semaines complètes (capées par créneaux et jours disponibles)
    const maxSemaines = Math.floor(joursSaison / 7);
    let nbSemaines = Math.min(Math.round(nbCreneaux * t.semaine), maxSemaines);

    // 2. Weekends dans les créneaux restants, capés par jours restants
    const creneauxRestants = nbCreneaux - nbSemaines;
    const joursApresSemaines = joursSaison - nbSemaines * 7;
    const maxWeekends = Math.min(creneauxRestants, Math.floor(joursApresSemaines / 2));
    let nbWeekends = Math.min(Math.round(creneauxRestants * t.weekend), maxWeekends);

    // 3. Midweeks basés sur les jours restants
    const joursRestants = joursSaison - nbSemaines * 7 - nbWeekends * 2;
    const maxMidweeks = Math.max(0, Math.floor(joursRestants / 4));
    let nbMidweeks = Math.min(Math.round(maxMidweeks * t.midweek), maxMidweeks);

    const nuitsSaison = nbSemaines * 7 + nbWeekends * 2 + nbMidweeks * 4;

    repartition[saison] = {
      semaine: nbSemaines,
      weekend: nbWeekends,
      midweek: nbMidweeks,
      nuits: nuitsSaison,
      taux: Math.min(Math.round(nuitsSaison / joursSaison * 100), 100)
    };

    totalNuits += nuitsSaison;
  });

  return { repartition, totalNuits };
}

/**
 * Calcule et affiche l'estimation annuelle du CA
 */
function calculerEstimation() {
  if (!jadoreState.resultats) return;

  const tauxCible = jadoreState.tauxRemplissage;
  const { repartition, totalNuits } = calculerRepartition(tauxCible);

  const menageTVAC = calculerMenageTVAC();
  const fraisGestionPct = jadoreState.fraisGestionPourcent / 100;

  let caJadore = 0;
  let caClient = 0;
  let caTotal = 0;

  // Calculer les CA par saison et type
  ['hs', 'ms', 'bs'].forEach(saison => {
    const rep = repartition[saison];
    const types = {
      semaine: rep.semaine,
      weekend: rep.weekend,
      midweek: rep.midweek
    };

    Object.entries(types).forEach(([type, nbReservations]) => {
      if (nbReservations <= 0) return;

      const prixEnPoche = jadoreState.prixPoche[saison][type];
      const loyer = prixEnPoche - menageTVAC;
      const fraisGestionTVAC = loyer * fraisGestionPct * (1 + TVA);

      const jadorePart = (menageTVAC + fraisGestionTVAC) * nbReservations;
      const clientPart = (prixEnPoche - menageTVAC - fraisGestionTVAC) * nbReservations;
      const totalPart = prixEnPoche * nbReservations;

      caJadore += jadorePart;
      caClient += clientPart;
      caTotal += totalPart;
    });
  });

  // Afficher les résultats
  afficherEstimation(repartition, totalNuits, tauxCible, caJadore, caClient, caTotal);
}

/**
 * Affiche l'estimation dans le DOM
 */
function afficherEstimation(repartition, totalNuits, tauxCible, caJadore, caClient, caTotal) {
  // Mettre à jour le titre
  document.getElementById('jadore-estimation-nuits').textContent = totalNuits;
  document.getElementById('jadore-estimation-taux').textContent = tauxCible;

  // Mettre à jour les cartes
  document.getElementById('jadore-ca-jadore').textContent = formatPrixEntier(caJadore);
  document.getElementById('jadore-ca-client').textContent = formatPrixEntier(caClient);
  document.getElementById('jadore-ca-total').textContent = formatPrixEntier(caTotal);

  // Mettre à jour le tableau de répartition
  const tbody = document.getElementById('jadore-repartition-body');
  let html = '';

  let totSemaines = 0, totWeekends = 0, totMidweeks = 0, totNuits = 0;

  ['hs', 'ms', 'bs'].forEach(saison => {
    const r = repartition[saison];
    totSemaines += r.semaine;
    totWeekends += r.weekend;
    totMidweeks += r.midweek;
    totNuits += r.nuits;

    html += `<tr>
      <td class="jadore-repartition-saison">${SAISONS[saison]}</td>
      <td>${r.semaine}</td>
      <td>${r.weekend}</td>
      <td>${r.midweek}</td>
      <td><strong>${r.nuits}</strong></td>
      <td>${r.taux}%</td>
    </tr>`;
  });

  const tauxTotal = Math.round(totNuits / 365 * 100);
  html += `<tr class="jadore-repartition-total">
    <td><strong>Total</strong></td>
    <td><strong>${totSemaines}</strong></td>
    <td><strong>${totWeekends}</strong></td>
    <td><strong>${totMidweeks}</strong></td>
    <td><strong>${totNuits}</strong></td>
    <td><strong>${tauxTotal}%</strong></td>
  </tr>`;

  tbody.innerHTML = html;
}

/**
 * Formater un prix entier (sans décimales) pour le CA annuel
 */
function formatPrixEntier(prix) {
  return Math.round(prix).toLocaleString('fr-FR') + ' €';
}

// Générer un rapport texte
function generateTextReport() {
  if (!jadoreState.resultats) return '';

  const menageTVAC = calculerMenageTVAC();
  let text = '';

  if (jadoreState.nomGite) {
    text += `${jadoreState.nomGite.toUpperCase()}\n`;
    text += '='.repeat(50) + '\n\n';
  }

  text += 'JADORE - CONCIERGERIE SAISONNIÈRE\n';
  text += '-'.repeat(50) + '\n\n';

  text += `Ménage: ${jadoreState.heuresMenage}h × ${jadoreState.tarifMenageHTVA}€ HTVA = ${formatPrix2Decimales(menageTVAC)} TVAC\n`;
  text += `Frais de gestion: ${jadoreState.fraisGestionPourcent}% HTVA (+21% TVA)\n\n`;

  ['bs', 'ms', 'hs'].forEach(saison => {
    text += `${SAISONS[saison].toUpperCase()}\n`;
    text += '-'.repeat(30) + '\n';

    ['weekend', 'midweek', 'semaine'].forEach(type => {
      const data = jadoreState.resultats[saison][type];
      if (!data) return;
      text += `\n  ${TYPES_SEJOUR[type]}:\n`;
      text += `    Loyer:           ${formatPrix2Decimales(data.loyer).padStart(12)}\n`;
      text += `    Ménage:          ${formatPrix2Decimales(data.menageTVAC).padStart(12)}\n`;
      text += `    Nous recevons:   ${formatPrix2Decimales(data.nousRecevons).padStart(12)}\n`;
      text += `    Frais gestion:   ${formatPrix2Decimales(data.fraisGestionTVAC).padStart(12)}\n`;
      text += `    Ménage:          ${formatPrix2Decimales(data.menageTVAC).padStart(12)}\n`;
      text += `    Total TVAC:      ${formatPrix2Decimales(data.totalFraisTVAC).padStart(12)}\n`;
      text += `    Vous gagnerez:   ${formatPrix2Decimales(data.vousGagnerez).padStart(12)}\n`;
    });

    text += '\n';
  });

  // Ajouter l'estimation annuelle
  const { repartition, totalNuits } = calculerRepartition(jadoreState.tauxRemplissage);
  const fraisGestionPct2 = jadoreState.fraisGestionPourcent / 100;
  let caJ = 0, caC = 0, caT = 0;

  ['hs', 'ms', 'bs'].forEach(saison => {
    const rep = repartition[saison];
    ['semaine', 'weekend', 'midweek'].forEach(type => {
      const nb = rep[type];
      if (nb <= 0) return;
      const pp = jadoreState.prixPoche[saison][type];
      const loyer = pp - menageTVAC;
      const fdg = loyer * fraisGestionPct2 * (1 + TVA);
      caJ += (menageTVAC + fdg) * nb;
      caC += (pp - menageTVAC - fdg) * nb;
      caT += pp * nb;
    });
  });

  text += 'ESTIMATION ANNUELLE\n';
  text += '='.repeat(50) + '\n';
  text += `Taux de remplissage: ${jadoreState.tauxRemplissage}% (${totalNuits} nuits)\n\n`;
  text += `  CA Jadore:       ${formatPrixEntier(caJ).padStart(12)}\n`;
  text += `  CA Client:       ${formatPrixEntier(caC).padStart(12)}\n`;
  text += `  CA Total Maison: ${formatPrixEntier(caT).padStart(12)}\n`;

  return text;
}

// Synchroniser vers Gîte Pricing
function syncToGitePricing() {
  readFormValues();
  saveToStorage();

  // Lire l'état actuel de Gîte Pricing depuis localStorage
  const giteRaw = localStorage.getItem('gitePricingState');
  const giteData = giteRaw ? JSON.parse(giteRaw) : {};

  // Syncer nom du gîte
  giteData.nomGite = jadoreState.nomGite;

  // Syncer ménage → nettoyage TVAC
  giteData.nettoyage = Math.round(jadoreState.heuresMenage * jadoreState.tarifMenageHTVA * 1.21 * 100) / 100;

  // Syncer prix souhaités (4 types)
  if (!giteData.prixPoche) giteData.prixPoche = {};
  ['bs', 'ms', 'hs'].forEach(s => {
    if (!giteData.prixPoche[s]) giteData.prixPoche[s] = {};
    giteData.prixPoche[s].weekend = jadoreState.prixPoche[s].weekend;
    giteData.prixPoche[s].longweekend = jadoreState.prixPoche[s].longweekend;
    giteData.prixPoche[s].midweek = jadoreState.prixPoche[s].midweek;
    giteData.prixPoche[s].semaine = jadoreState.prixPoche[s].semaine;
  });

  // Sauvegarder
  localStorage.setItem('gitePricingState', JSON.stringify(giteData));

  // Feedback visuel
  const btn = document.getElementById('jadore-btn-sync');
  const originalText = btn.textContent;
  btn.textContent = '\u2713 Synchronis\u00e9 !';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = originalText;
    btn.disabled = false;
  }, 2000);
}
