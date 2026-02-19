/**
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
    bs: { weekend: 1500, midweek: 1500, semaine: 2500 },
    ms: { weekend: 1800, midweek: 1600, semaine: 3000 },
    hs: { weekend: 2000, midweek: 2000, semaine: 3500 }
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
      updateFormFromState();
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
    prixPoche: jadoreState.prixPoche
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
    ['weekend', 'midweek', 'semaine'].forEach(type => {
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
    let val = Math.min(90, Math.max(20, parseFloat(sliderInput.value) || 20));
    slider.value = val;
    jadoreState.tauxRemplissage = val;
    calculerEstimation();
  });
  sliderInput.addEventListener('change', () => {
    let val = Math.min(90, Math.max(20, parseFloat(sliderInput.value) || 20));
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
      bs: { weekend: 1500, midweek: 1500, semaine: 2500 },
      ms: { weekend: 1800, midweek: 1600, semaine: 3000 },
      hs: { weekend: 2000, midweek: 2000, semaine: 3500 }
    },
    resultats: null
  };
  updateFormFromState();
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

// Données réelles de l'année par saison
const JOURS_PAR_SAISON = { hs: 93, ms: 61, bs: 211 }; // = 365 jours
const WEEKENDS_PAR_SAISON = { hs: 18, ms: 10, bs: 24 }; // = 52 weekends

// Taux de remplissage de base (calibration réaliste)
// Weekends se remplissent en premier, puis midweeks, puis semaines complètes
const TAUX_BASE = {
  hs: { semaine: 0.75, weekend: 1.00, midweek: 0.80 },
  ms: { semaine: 0.40, weekend: 0.80, midweek: 0.50 },
  bs: { semaine: 0.10, weekend: 0.40, midweek: 0.20 }
};

// Plafonds pour les taux après scaling
const TAUX_PLAFOND = { semaine: 0.95, weekend: 1.00, midweek: 0.95 };

/**
 * Calcule les réservations par saison et type en fonction du taux cible.
 * Algorithme itératif qui scale les taux de base pour atteindre le nombre de nuits cible.
 */
function calculerRepartition(tauxCiblePct) {
  const nuitsCibles = Math.round(365 * tauxCiblePct / 100);

  // Copier les taux de base
  let tauxActuels = {};
  ['hs', 'ms', 'bs'].forEach(s => {
    tauxActuels[s] = { ...TAUX_BASE[s] };
  });

  // Itérer pour ajuster le facteur d'échelle
  for (let iter = 0; iter < 20; iter++) {
    const result = simulerReservations(tauxActuels);
    const nuitsCalculees = result.totalNuits;

    if (Math.abs(nuitsCalculees - nuitsCibles) <= 1) break;

    const facteur = nuitsCibles / Math.max(nuitsCalculees, 1);

    // Appliquer le facteur avec plafonds
    ['hs', 'ms', 'bs'].forEach(s => {
      ['semaine', 'weekend', 'midweek'].forEach(t => {
        tauxActuels[s][t] = Math.min(
          tauxActuels[s][t] * facteur,
          TAUX_PLAFOND[t]
        );
      });
    });
  }

  return simulerReservations(tauxActuels);
}

/**
 * Simule les réservations en respectant la logique de priorité :
 * 1. Semaines complètes (7n) → consomment 1 créneau WE + 1 créneau MW
 * 2. Weekends (2n) dans les créneaux restants
 * 3. Midweeks (4n) dans les créneaux restants
 *
 * Le nombre de créneaux par saison = nombre de weekends disponibles.
 */
function simulerReservations(taux) {
  const repartition = {};
  let totalNuits = 0;

  ['hs', 'ms', 'bs'].forEach(saison => {
    const nbCreneaux = WEEKENDS_PAR_SAISON[saison];
    const joursSaison = JOURS_PAR_SAISON[saison];
    const t = taux[saison];

    // 1. Semaines complètes (bloquent 1 WE + 1 MW)
    const nbSemaines = Math.round(nbCreneaux * t.semaine);

    // Créneaux restants pour WE et MW séparés
    const restant = nbCreneaux - nbSemaines;

    // 2. Weekends dans les créneaux restants
    const nbWeekends = Math.round(restant * t.weekend);

    // 3. Midweeks dans les créneaux restants
    const nbMidweeks = Math.round(restant * t.midweek);

    // Calcul des nuits
    const nuitsSaison = nbSemaines * 7 + nbWeekends * 2 + nbMidweeks * 4;

    repartition[saison] = {
      semaine: nbSemaines,
      weekend: nbWeekends,
      midweek: nbMidweeks,
      nuits: nuitsSaison,
      taux: Math.round(nuitsSaison / joursSaison * 100)
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
