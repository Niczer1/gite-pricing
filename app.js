/**
 * Copyright (c) 2026 Nico Hendriks — TVA BE0538.631.496
 * Tous droits réservés / All rights reserved.
 * Voir le fichier LICENSE pour plus de détails.
 *
 * Gîte Pricing - Application de calcul de prix pour locations de vacances
 *
 * Logique de calcul :
 * - Prix en poche = ce que tu veux recevoir (nettoyage inclus dedans)
 * - Prix affiché = Prix en poche / (1 - Commission%)
 * - Le nettoyage est une partie du prix en poche, pas un ajout
 *
 * Réductions :
 * - La réduction s'applique sur le prix AFFICHÉ du séjour (basé sur le prix par nuit)
 * - Réductions identiques pour toutes les saisons
 */

// État de l'application
let appState = {
  nomGite: '',
  nettoyage: 200,
  commissions: {
    booking: 13.25,
    airbnb: 18.76,
    natuurhuisje: 12
  },
  arrondi: 5,
  // Réductions globales (identiques pour toutes les saisons)
  reductions: {
    midweek: 0,
    semaine: 0
  },
  prixPoche: {
    bs: { weekend: 1500, longweekend: 1800, midweek: 1500 },
    ms: { weekend: 1800, longweekend: 2200, midweek: 1600 },
    hs: { weekend: 2000, longweekend: 2500, midweek: 2000 }
  },
  resultats: null
};

// Noms lisibles
const SAISONS = {
  bs: 'Basse Saison',
  ms: 'Moyenne Saison',
  hs: 'Haute Saison'
};

const PLATEFORMES = ['booking', 'airbnb', 'natuurhuisje'];
const PLATEFORME_NOMS = {
  booking: 'Booking',
  airbnb: 'Airbnb',
  natuurhuisje: 'Natuurhuisje'
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initializeEventListeners();
  calculer();
});

// Charger depuis le localStorage
function loadFromStorage() {
  const saved = localStorage.getItem('gitePricingState');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      appState = { ...appState, ...data };
      // Migration : s'assurer que reductions est au bon format
      if (!appState.reductions || typeof appState.reductions.midweek === 'undefined') {
        appState.reductions = { midweek: 0, semaine: 0 };
      }
      // Migration : supprimer semaine des prixPoche (maintenant calculé automatiquement)
      ['bs', 'ms', 'hs'].forEach(s => {
        if (appState.prixPoche[s]) {
          delete appState.prixPoche[s].semaine;
        }
      });
      updateFormFromState();
    } catch (e) {
      console.error('Erreur lors du chargement des données:', e);
    }
  }
}

// Sauvegarder dans le localStorage
function saveToStorage() {
  localStorage.setItem('gitePricingState', JSON.stringify({
    nomGite: appState.nomGite,
    nettoyage: appState.nettoyage,
    commissions: appState.commissions,
    arrondi: appState.arrondi,
    reductions: appState.reductions,
    prixPoche: appState.prixPoche
  }));
}

// Mettre à jour le formulaire depuis l'état
function updateFormFromState() {
  document.getElementById('nom-gite').value = appState.nomGite || '';
  document.getElementById('nettoyage').value = appState.nettoyage;
  document.getElementById('commission-booking').value = appState.commissions.booking;
  document.getElementById('commission-airbnb').value = appState.commissions.airbnb;
  document.getElementById('commission-natuurhuisje').value = appState.commissions.natuurhuisje;
  document.getElementById('arrondi').value = appState.arrondi;
  document.getElementById('reduction-midweek').value = appState.reductions.midweek;
  document.getElementById('reduction-semaine').value = appState.reductions.semaine;

  ['bs', 'ms', 'hs'].forEach(saison => {
    document.getElementById(`${saison}-weekend`).value = appState.prixPoche[saison].weekend;
    document.getElementById(`${saison}-longweekend`).value = appState.prixPoche[saison].longweekend;
    document.getElementById(`${saison}-midweek`).value = appState.prixPoche[saison].midweek;
  });
}

// Lire les valeurs du formulaire
function readFormValues() {
  appState.nomGite = document.getElementById('nom-gite').value.trim();
  appState.nettoyage = parseFloat(document.getElementById('nettoyage').value) || 0;
  appState.commissions.booking = parseFloat(document.getElementById('commission-booking').value) || 0;
  appState.commissions.airbnb = parseFloat(document.getElementById('commission-airbnb').value) || 0;
  appState.commissions.natuurhuisje = parseFloat(document.getElementById('commission-natuurhuisje').value) || 0;
  appState.arrondi = parseInt(document.getElementById('arrondi').value) || 1;
  appState.reductions.midweek = parseFloat(document.getElementById('reduction-midweek').value) || 0;
  appState.reductions.semaine = parseFloat(document.getElementById('reduction-semaine').value) || 0;

  ['bs', 'ms', 'hs'].forEach(saison => {
    appState.prixPoche[saison].weekend = parseFloat(document.getElementById(`${saison}-weekend`).value) || 0;
    appState.prixPoche[saison].longweekend = parseFloat(document.getElementById(`${saison}-longweekend`).value) || 0;
    appState.prixPoche[saison].midweek = parseFloat(document.getElementById(`${saison}-midweek`).value) || 0;
  });
}

// Initialiser les écouteurs d'événements
function initializeEventListeners() {
  // Bouton calculer
  document.getElementById('btn-calculer').addEventListener('click', () => {
    readFormValues();
    saveToStorage();
    calculer();
  });

  // Bouton réinitialiser
  document.getElementById('btn-reset').addEventListener('click', resetToDefaults);

  // Bouton synchroniser
  document.getElementById('btn-sync').addEventListener('click', syncToJadore);

  // Boutons d'export
  document.getElementById('btn-copy').addEventListener('click', copyToClipboard);
  document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
  document.getElementById('btn-print').addEventListener('click', () => window.print());

  // Onglets
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const season = e.target.dataset.season;
      switchTab(season);
    });
  });

  // Écouteurs pour les champs de prix
  ['bs', 'ms', 'hs'].forEach(saison => {
    ['weekend', 'longweekend', 'midweek'].forEach(type => {
      document.getElementById(`${saison}-${type}`).addEventListener('change', () => {
        readFormValues();
        saveToStorage();
        calculer();
      });
    });
  });

  // Écouteurs pour les réductions globales
  ['reduction-midweek', 'reduction-semaine'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      readFormValues();
      saveToStorage();
      calculer();
    });
  });

  // Autres champs (commissions, nettoyage, arrondi, nom)
  ['nettoyage', 'commission-booking', 'commission-airbnb', 'commission-natuurhuisje', 'arrondi', 'nom-gite'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      readFormValues();
      saveToStorage();
      calculer();
    });
  });
}

// Changer d'onglet
function switchTab(season) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.season-content').forEach(c => c.classList.remove('active'));

  document.querySelector(`.tab[data-season="${season}"]`).classList.add('active');
  document.getElementById(`content-${season}`).classList.add('active');
}

// Réinitialiser aux valeurs par défaut
function resetToDefaults() {
  appState = {
    nomGite: '',
    nettoyage: 200,
    commissions: {
      booking: 13.25,
      airbnb: 18.76,
      natuurhuisje: 12
    },
    arrondi: 5,
    reductions: {
      midweek: 0,
      semaine: 0
    },
    prixPoche: {
      bs: { weekend: 1500, longweekend: 1800, midweek: 1500 },
      ms: { weekend: 1800, longweekend: 2200, midweek: 1600 },
      hs: { weekend: 2000, longweekend: 2500, midweek: 2000 }
    },
    resultats: null
  };
  updateFormFromState();
  saveToStorage();
  calculer();
}

// Arrondir selon le paramètre
function arrondir(valeur) {
  const arrondi = appState.arrondi;
  return Math.round(valeur / arrondi) * arrondi;
}

// Calculer le prix affiché sur une plateforme
// Prix affiché = Prix en poche / (1 - Commission%)
function calculerPrixAffiche(prixPoche, commissionPourcent) {
  const prixBrut = prixPoche / (1 - commissionPourcent / 100);
  return arrondir(prixBrut);
}

// Calculer le prix "en poche" à partir du prix affiché
function calculerPrixPoche(prixAffiche, commissionPourcent) {
  return prixAffiche * (1 - commissionPourcent / 100);
}

// Effectuer tous les calculs
function calculer() {
  const validations = validerPrix();
  afficherValidations(validations);

  // Mettre à jour le header d'impression
  updatePrintHeader();

  const resultats = {};
  const reductionMidweek = appState.reductions.midweek;
  const reductionSemaine = appState.reductions.semaine;
  const nettoyageAffiche = appState.nettoyage; // Le nettoyage encodé est déjà le prix affiché au client

  ['bs', 'ms', 'hs'].forEach(saison => {
    const prixPoche = appState.prixPoche[saison];

    resultats[saison] = {
      prixParNuit: {},
      prixSejours: {}
    };

    // Calculer pour chaque plateforme
    PLATEFORMES.forEach(plateforme => {
      const commission = appState.commissions[plateforme];

      // Prix total affiché au client = prix en poche / (1 - commission)
      const weekendTotalAffiche = calculerPrixAffiche(prixPoche.weekend, commission);
      const longweekendTotalAffiche = calculerPrixAffiche(prixPoche.longweekend, commission);
      const midweekTotalAffiche = calculerPrixAffiche(prixPoche.midweek, commission);

      // Prix des nuits affiché = prix total - nettoyage (le nettoyage est déjà en prix affiché)
      const weekendNuitsAffiche = weekendTotalAffiche - nettoyageAffiche;
      const longweekendNuitsAffiche = longweekendTotalAffiche - nettoyageAffiche;
      const midweekNuitsAffiche = midweekTotalAffiche - nettoyageAffiche;

      // Prix par nuit (basé sur le prix des nuits, sans nettoyage)
      // Weekend = 2 nuits (ven + sam)
      const prixVenSam = arrondir(weekendNuitsAffiche / 2);

      // Long weekend = 3 nuits (ven + sam + dim)
      // Prix dimanche = Long weekend nuits - (2 * prixVenSam)
      const prixDimanche = arrondir(longweekendNuitsAffiche - (prixVenSam * 2));

      // Pour le midweek avec réduction :
      // Prix midweek nuits = prixNuit * 4 * (1 - réduction)
      // Donc : prixNuit = midweekNuitsAffiche / (1 - réduction) / 4
      const prixLunJeu = reductionMidweek > 0
        ? arrondir((midweekNuitsAffiche / (1 - reductionMidweek / 100)) / 4)
        : arrondir(midweekNuitsAffiche / 4);

      // Prix théoriques (plein tarif par nuit, sans réduction séjour)
      const midweekTheorique = prixLunJeu * 4;
      const midweekTotalTheorique = midweekTheorique + nettoyageAffiche;

      // Semaine calculée automatiquement depuis les prix par nuit
      // semaineTheorique = somme des 7 nuits au plein tarif (sans réduction)
      const semaineTheorique = (prixVenSam * 2) + (prixLunJeu * 4) + prixDimanche;
      // semaineNuitsReduit = avec réduction semaine appliquée
      const semaineNuitsReduit = reductionSemaine > 0
        ? arrondir(semaineTheorique * (1 - reductionSemaine / 100))
        : semaineTheorique;
      // Prix total affiché = nuits réduites + nettoyage
      const semaineTotalAffiche = semaineNuitsReduit + nettoyageAffiche;
      const semaineTotalTheorique = semaineTheorique + nettoyageAffiche;

      // Prix "en poche" = ce que vous avez demandé (toujours inchangé pour weekend/longweekend/midweek)
      const pocheWeekend = prixPoche.weekend;
      const pocheLongweekend = prixPoche.longweekend;
      const pocheMidweek = prixPoche.midweek;
      // Semaine en poche = calculé automatiquement
      const pocheSemaine = calculerPrixPoche(semaineTotalAffiche, commission);

      // Estimations courtes durées (prix affiché + prix en poche)
      const estimations = [
        { id: '1nuitMidweek', nuits: 1, prixNuit: prixLunJeu },
        { id: '1nuitWeekend', nuits: 1, prixNuit: prixVenSam },
        { id: '2nuitsMidweek', nuits: 2, prixNuit: prixLunJeu },
        { id: '3nuitsMidweek', nuits: 3, prixNuit: prixLunJeu }
      ];
      const estimationsResultats = {};
      estimations.forEach(({ id, nuits, prixNuit }) => {
        const totalAffiche = (prixNuit * nuits) + nettoyageAffiche;
        const poche = calculerPrixPoche(totalAffiche, commission);
        estimationsResultats[id] = { totalAffiche, poche };
      });

      // Stocker les résultats
      resultats[saison].prixParNuit[plateforme] = {
        lunJeu: prixLunJeu,
        venSam: prixVenSam,
        dimanche: prixDimanche
      };

      resultats[saison].estimations = resultats[saison].estimations || {};
      resultats[saison].estimations[plateforme] = estimationsResultats;

      resultats[saison].prixSejours[plateforme] = {
        weekend: weekendTotalAffiche,
        longweekend: longweekendTotalAffiche,
        midweek: midweekTotalAffiche,
        semaine: semaineTotalAffiche,
        pocheWeekend: pocheWeekend,
        pocheLongweekend: pocheLongweekend,
        pocheMidweek: pocheMidweek,
        pocheSemaine: pocheSemaine,
        reductionMidweek: reductionMidweek,
        reductionSemaine: reductionSemaine,
        midweekTotalTheorique: midweekTotalTheorique,
        semaineTotalTheorique: semaineTotalTheorique
      };
    });
  });

  appState.resultats = resultats;
  afficherResultats();
}

// Mettre à jour le header d'impression
function updatePrintHeader() {
  const printHeader = document.getElementById('print-header');
  if (appState.nomGite) {
    printHeader.innerHTML = `<h2 class="print-gite-name">${appState.nomGite}</h2><p class="print-date">Généré le ${new Date().toLocaleDateString('fr-FR')}</p>`;
  } else {
    printHeader.innerHTML = '';
  }
}

// Valider la cohérence des prix
function validerPrix() {
  const messages = [];

  ['bs', 'ms', 'hs'].forEach(saison => {
    const prix = appState.prixPoche[saison];
    const nomSaison = SAISONS[saison];
    const nettoyage = appState.nettoyage;

    // Vérifier que le prix weekend est supérieur au nettoyage
    if (prix.weekend <= nettoyage) {
      messages.push({
        type: 'error',
        text: `${nomSaison} : Le prix weekend (${prix.weekend}€) doit être supérieur au nettoyage (${nettoyage}€).`
      });
    }
  });

  // Vérifier la progression entre saisons
  if (appState.prixPoche.ms.weekend < appState.prixPoche.bs.weekend) {
    messages.push({
      type: 'warning',
      text: `Le prix weekend Moyenne Saison est inférieur à celui de Basse Saison.`
    });
  }

  if (appState.prixPoche.hs.weekend < appState.prixPoche.ms.weekend) {
    messages.push({
      type: 'warning',
      text: `Le prix weekend Haute Saison est inférieur à celui de Moyenne Saison.`
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
  const container = document.getElementById('validation-messages');
  container.innerHTML = messages.map(msg => `
    <div class="validation-message validation-${msg.type}">
      ${msg.text}
    </div>
  `).join('');
}

// Afficher les résultats
function afficherResultats() {
  if (!appState.resultats) return;

  ['bs', 'ms', 'hs'].forEach(saison => {
    afficherTableauNuit(saison);
    afficherTableauSejour(saison);
    afficherTableauEstimations(saison);
  });

  afficherTableauRecap();
}

// Formater un prix
function formatPrix(prix) {
  return Math.round(prix).toLocaleString('fr-FR') + ' €';
}

// Formater un prix avec prix théorique barré (si réduction active)
function formatPrixAvecTheorique(prix, theorique, hasReduction) {
  if (hasReduction && theorique > prix) {
    return `<span class="prix-theorique">${formatPrix(theorique)}</span> ${formatPrix(prix)}`;
  }
  return formatPrix(prix);
}

// Afficher le tableau des prix par nuit
function afficherTableauNuit(saison) {
  const data = appState.resultats[saison];
  const container = document.getElementById(`table-nuit-${saison}`);

  const html = `
    <table>
      <thead>
        <tr>
          <th>${SAISONS[saison]}</th>
          <th class="platform-booking">Booking</th>
          <th class="platform-airbnb">Airbnb</th>
          <th class="platform-natuurhuisje">Natuurhuisje</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Lundi - Jeudi</td>
          <td>${formatPrix(data.prixParNuit.booking.lunJeu)}</td>
          <td>${formatPrix(data.prixParNuit.airbnb.lunJeu)}</td>
          <td>${formatPrix(data.prixParNuit.natuurhuisje.lunJeu)}</td>
        </tr>
        <tr>
          <td>Vendredi - Samedi</td>
          <td>${formatPrix(data.prixParNuit.booking.venSam)}</td>
          <td>${formatPrix(data.prixParNuit.airbnb.venSam)}</td>
          <td>${formatPrix(data.prixParNuit.natuurhuisje.venSam)}</td>
        </tr>
        <tr>
          <td>Dimanche</td>
          <td>${formatPrix(data.prixParNuit.booking.dimanche)}</td>
          <td>${formatPrix(data.prixParNuit.airbnb.dimanche)}</td>
          <td>${formatPrix(data.prixParNuit.natuurhuisje.dimanche)}</td>
        </tr>
      </tbody>
    </table>
    <p class="table-note">Nettoyage inclus dans les prix: ${appState.nettoyage}€</p>
  `;

  container.innerHTML = html;
}

// Afficher le tableau des séjours
function afficherTableauSejour(saison) {
  const data = appState.resultats[saison];
  const container = document.getElementById(`table-sejour-${saison}`);
  const reductionMidweek = appState.reductions.midweek;
  const reductionSemaine = appState.reductions.semaine;

  const html = `
    <table>
      <thead>
        <tr>
          <th>Réduction</th>
          <th>Type de séjour</th>
          <th class="platform-booking">Booking</th>
          <th class="platform-airbnb">Airbnb</th>
          <th class="platform-natuurhuisje">Natuur.</th>
          <th class="poche-cell">Poche Book.</th>
          <th class="poche-cell">Poche Airbnb</th>
          <th class="poche-cell">Poche Natuur.</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="reduction-cell no-reduction">0%</td>
          <td>Weekend (2 nuits)</td>
          <td>${formatPrix(data.prixSejours.booking.weekend)}</td>
          <td>${formatPrix(data.prixSejours.airbnb.weekend)}</td>
          <td>${formatPrix(data.prixSejours.natuurhuisje.weekend)}</td>
          <td class="poche-cell">${formatPrix(data.prixSejours.booking.pocheWeekend)}</td>
          <td class="poche-cell">${formatPrix(data.prixSejours.airbnb.pocheWeekend)}</td>
          <td class="poche-cell">${formatPrix(data.prixSejours.natuurhuisje.pocheWeekend)}</td>
        </tr>
        <tr>
          <td class="reduction-cell no-reduction">0%</td>
          <td>Long Weekend (3 nuits)</td>
          <td>${formatPrix(data.prixSejours.booking.longweekend)}</td>
          <td>${formatPrix(data.prixSejours.airbnb.longweekend)}</td>
          <td>${formatPrix(data.prixSejours.natuurhuisje.longweekend)}</td>
          <td class="poche-cell">${formatPrix(data.prixSejours.booking.pocheLongweekend)}</td>
          <td class="poche-cell">${formatPrix(data.prixSejours.airbnb.pocheLongweekend)}</td>
          <td class="poche-cell">${formatPrix(data.prixSejours.natuurhuisje.pocheLongweekend)}</td>
        </tr>
        <tr>
          <td class="reduction-cell ${reductionMidweek <= 0 ? 'no-reduction' : ''}">${reductionMidweek}%</td>
          <td>Midweek (4 nuits)</td>
          <td>${formatPrixAvecTheorique(data.prixSejours.booking.midweek, data.prixSejours.booking.midweekTotalTheorique, reductionMidweek > 0)}</td>
          <td>${formatPrixAvecTheorique(data.prixSejours.airbnb.midweek, data.prixSejours.airbnb.midweekTotalTheorique, reductionMidweek > 0)}</td>
          <td>${formatPrixAvecTheorique(data.prixSejours.natuurhuisje.midweek, data.prixSejours.natuurhuisje.midweekTotalTheorique, reductionMidweek > 0)}</td>
          <td class="poche-cell">${formatPrix(data.prixSejours.booking.pocheMidweek)}</td>
          <td class="poche-cell">${formatPrix(data.prixSejours.airbnb.pocheMidweek)}</td>
          <td class="poche-cell">${formatPrix(data.prixSejours.natuurhuisje.pocheMidweek)}</td>
        </tr>
        <tr>
          <td class="reduction-cell ${reductionSemaine <= 0 ? 'no-reduction' : ''}">${reductionSemaine}%</td>
          <td>Semaine (7 nuits)</td>
          <td>${formatPrixAvecTheorique(data.prixSejours.booking.semaine, data.prixSejours.booking.semaineTotalTheorique, reductionSemaine > 0)}</td>
          <td>${formatPrixAvecTheorique(data.prixSejours.airbnb.semaine, data.prixSejours.airbnb.semaineTotalTheorique, reductionSemaine > 0)}</td>
          <td>${formatPrixAvecTheorique(data.prixSejours.natuurhuisje.semaine, data.prixSejours.natuurhuisje.semaineTotalTheorique, reductionSemaine > 0)}</td>
          <td class="poche-cell">${formatPrix(data.prixSejours.booking.pocheSemaine)}</td>
          <td class="poche-cell">${formatPrix(data.prixSejours.airbnb.pocheSemaine)}</td>
          <td class="poche-cell">${formatPrix(data.prixSejours.natuurhuisje.pocheSemaine)}</td>
        </tr>
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

// Afficher le tableau des estimations courtes durées
function afficherTableauEstimations(saison) {
  const data = appState.resultats[saison];
  const container = document.getElementById(`table-estimations-${saison}`);

  const lignes = [
    { id: '1nuitWeekend', label: '1 nuit weekend (ven ou sam)' },
    { id: '1nuitMidweek', label: '1 nuit midweek (lun-jeu)' },
    { id: '2nuitsMidweek', label: '2 nuits midweek' },
    { id: '3nuitsMidweek', label: '3 nuits midweek' }
  ];

  const html = `
    <table>
      <thead>
        <tr>
          <th>Durée</th>
          <th class="platform-booking">Booking</th>
          <th class="platform-airbnb">Airbnb</th>
          <th class="platform-natuurhuisje">Natuur.</th>
          <th class="poche-cell">Poche Book.</th>
          <th class="poche-cell">Poche Airbnb</th>
          <th class="poche-cell">Poche Natuur.</th>
        </tr>
      </thead>
      <tbody>
        ${lignes.map(({ id, label }) => `
        <tr>
          <td>${label}</td>
          <td>${formatPrix(data.estimations.booking[id].totalAffiche)}</td>
          <td>${formatPrix(data.estimations.airbnb[id].totalAffiche)}</td>
          <td>${formatPrix(data.estimations.natuurhuisje[id].totalAffiche)}</td>
          <td class="poche-cell">${formatPrix(data.estimations.booking[id].poche)}</td>
          <td class="poche-cell">${formatPrix(data.estimations.airbnb[id].poche)}</td>
          <td class="poche-cell">${formatPrix(data.estimations.natuurhuisje[id].poche)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <p class="table-note">Nettoyage (${appState.nettoyage}€) inclus dans chaque estimation</p>
  `;

  container.innerHTML = html;
}

// Afficher le tableau récapitulatif global
function afficherTableauRecap() {
  const resultats = appState.resultats;
  const container = document.getElementById('table-recap-global');

  let html = `
    <table class="recap-table">
      <thead>
        <tr>
          <th>Plateforme</th>
          <th>Jour</th>
          <th class="season-header bs">Basse Saison</th>
          <th class="season-header ms">Moyenne Saison</th>
          <th class="season-header hs">Haute Saison</th>
        </tr>
      </thead>
      <tbody>
  `;

  PLATEFORMES.forEach((plateforme, index) => {
    const jours = ['lunJeu', 'venSam', 'dimanche'];
    const joursNoms = ['Lundi - Jeudi', 'Vendredi - Samedi', 'Dimanche'];

    jours.forEach((jour, jourIndex) => {
      html += `
        <tr class="${jourIndex === 0 ? 'platform-start' : ''}">
          ${jourIndex === 0 ? `<td rowspan="3" class="platform-${plateforme}"><strong>${PLATEFORME_NOMS[plateforme]}</strong></td>` : ''}
          <td>${joursNoms[jourIndex]}</td>
          <td class="row-bs">${formatPrix(resultats.bs.prixParNuit[plateforme][jour])}</td>
          <td class="row-ms">${formatPrix(resultats.ms.prixParNuit[plateforme][jour])}</td>
          <td class="row-hs">${formatPrix(resultats.hs.prixParNuit[plateforme][jour])}</td>
        </tr>
      `;
    });

    if (index < PLATEFORMES.length - 1) {
      html += `<tr class="separator"><td colspan="5" style="height: 4px; background: var(--border-color);"></td></tr>`;
    }
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
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

// Générer un rapport texte
function generateTextReport() {
  if (!appState.resultats) return '';

  let text = '';

  if (appState.nomGite) {
    text += `${appState.nomGite.toUpperCase()}\n`;
    text += '='.repeat(50) + '\n\n';
  }

  text += 'RÉCAPITULATIF DES PRIX\n';
  text += '-'.repeat(50) + '\n\n';

  text += `Nettoyage (inclus dans prix en poche): ${appState.nettoyage}€\n`;
  text += `Commissions: Booking ${appState.commissions.booking}%, Airbnb ${appState.commissions.airbnb}%, Natuurhuisje ${appState.commissions.natuurhuisje}%\n`;
  text += `Réductions: Midweek ${appState.reductions.midweek}%, Semaine ${appState.reductions.semaine}%\n\n`;

  ['bs', 'ms', 'hs'].forEach(saison => {
    const data = appState.resultats[saison];
    text += `${SAISONS[saison].toUpperCase()}\n`;
    text += '-'.repeat(30) + '\n';

    text += '\nPrix par nuit:\n';
    text += `  Lundi-Jeudi:      Booking ${formatPrix(data.prixParNuit.booking.lunJeu).padStart(8)} | Airbnb ${formatPrix(data.prixParNuit.airbnb.lunJeu).padStart(8)} | Natuur. ${formatPrix(data.prixParNuit.natuurhuisje.lunJeu).padStart(8)}\n`;
    text += `  Vendredi-Samedi:  Booking ${formatPrix(data.prixParNuit.booking.venSam).padStart(8)} | Airbnb ${formatPrix(data.prixParNuit.airbnb.venSam).padStart(8)} | Natuur. ${formatPrix(data.prixParNuit.natuurhuisje.venSam).padStart(8)}\n`;
    text += `  Dimanche:         Booking ${formatPrix(data.prixParNuit.booking.dimanche).padStart(8)} | Airbnb ${formatPrix(data.prixParNuit.airbnb.dimanche).padStart(8)} | Natuur. ${formatPrix(data.prixParNuit.natuurhuisje.dimanche).padStart(8)}\n`;

    text += '\nPrix séjours:\n';
    text += `  Weekend:      Booking ${formatPrix(data.prixSejours.booking.weekend).padStart(8)} | Airbnb ${formatPrix(data.prixSejours.airbnb.weekend).padStart(8)} | Natuur. ${formatPrix(data.prixSejours.natuurhuisje.weekend).padStart(8)}\n`;
    text += `  Long Weekend: Booking ${formatPrix(data.prixSejours.booking.longweekend).padStart(8)} | Airbnb ${formatPrix(data.prixSejours.airbnb.longweekend).padStart(8)} | Natuur. ${formatPrix(data.prixSejours.natuurhuisje.longweekend).padStart(8)}\n`;
    text += `  Midweek:      Booking ${formatPrix(data.prixSejours.booking.midweek).padStart(8)} | Airbnb ${formatPrix(data.prixSejours.airbnb.midweek).padStart(8)} | Natuur. ${formatPrix(data.prixSejours.natuurhuisje.midweek).padStart(8)} (réduction: ${appState.reductions.midweek}%)\n`;
    text += `  Semaine:      Booking ${formatPrix(data.prixSejours.booking.semaine).padStart(8)} | Airbnb ${formatPrix(data.prixSejours.airbnb.semaine).padStart(8)} | Natuur. ${formatPrix(data.prixSejours.natuurhuisje.semaine).padStart(8)} (réduction: ${appState.reductions.semaine}%)\n`;

    text += '\nEstimations courtes durées (nettoyage inclus):\n';
    const estLabels = [
      { id: '1nuitWeekend', label: '1 nuit weekend' },
      { id: '1nuitMidweek', label: '1 nuit midweek' },
      { id: '2nuitsMidweek', label: '2 nuits midweek' },
      { id: '3nuitsMidweek', label: '3 nuits midweek' }
    ];
    estLabels.forEach(({ id, label }) => {
      text += `  ${label.padEnd(16)} Booking ${formatPrix(data.estimations.booking[id].totalAffiche).padStart(8)} (poche ${formatPrix(data.estimations.booking[id].poche).padStart(8)}) | Airbnb ${formatPrix(data.estimations.airbnb[id].totalAffiche).padStart(8)} (poche ${formatPrix(data.estimations.airbnb[id].poche).padStart(8)}) | Natuur. ${formatPrix(data.estimations.natuurhuisje[id].totalAffiche).padStart(8)} (poche ${formatPrix(data.estimations.natuurhuisje[id].poche).padStart(8)})\n`;
    });

    text += '\n';
  });

  return text;
}

// Exporter en CSV
function exportCSV() {
  if (!appState.resultats) return;

  let csv = '';

  if (appState.nomGite) {
    csv += `Gîte;${appState.nomGite}\n`;
  }
  csv += `Date;${new Date().toLocaleDateString('fr-FR')}\n`;
  csv += `Nettoyage;${appState.nettoyage}\n`;
  csv += `Réduction Midweek;${appState.reductions.midweek}%\n`;
  csv += `Réduction Semaine;${appState.reductions.semaine}%\n\n`;

  csv += 'Saison;Type;Jour/Séjour;Réduction;Booking;Airbnb;Natuurhuisje;Poche Booking;Poche Airbnb;Poche Natuurhuisje\n';

  ['bs', 'ms', 'hs'].forEach(saison => {
    const data = appState.resultats[saison];
    const nomSaison = SAISONS[saison];

    // Prix par nuit
    csv += `${nomSaison};Par nuit;Lundi-Jeudi;;${data.prixParNuit.booking.lunJeu};${data.prixParNuit.airbnb.lunJeu};${data.prixParNuit.natuurhuisje.lunJeu};;;\n`;
    csv += `${nomSaison};Par nuit;Vendredi-Samedi;;${data.prixParNuit.booking.venSam};${data.prixParNuit.airbnb.venSam};${data.prixParNuit.natuurhuisje.venSam};;;\n`;
    csv += `${nomSaison};Par nuit;Dimanche;;${data.prixParNuit.booking.dimanche};${data.prixParNuit.airbnb.dimanche};${data.prixParNuit.natuurhuisje.dimanche};;;\n`;

    // Prix des séjours
    csv += `${nomSaison};Séjour;Weekend;0%;${data.prixSejours.booking.weekend};${data.prixSejours.airbnb.weekend};${data.prixSejours.natuurhuisje.weekend};${Math.round(data.prixSejours.booking.pocheWeekend)};${Math.round(data.prixSejours.airbnb.pocheWeekend)};${Math.round(data.prixSejours.natuurhuisje.pocheWeekend)}\n`;
    csv += `${nomSaison};Séjour;Long Weekend;0%;${data.prixSejours.booking.longweekend};${data.prixSejours.airbnb.longweekend};${data.prixSejours.natuurhuisje.longweekend};${Math.round(data.prixSejours.booking.pocheLongweekend)};${Math.round(data.prixSejours.airbnb.pocheLongweekend)};${Math.round(data.prixSejours.natuurhuisje.pocheLongweekend)}\n`;
    csv += `${nomSaison};Séjour;Midweek;${appState.reductions.midweek}%;${data.prixSejours.booking.midweek};${data.prixSejours.airbnb.midweek};${data.prixSejours.natuurhuisje.midweek};${Math.round(data.prixSejours.booking.pocheMidweek)};${Math.round(data.prixSejours.airbnb.pocheMidweek)};${Math.round(data.prixSejours.natuurhuisje.pocheMidweek)}\n`;
    csv += `${nomSaison};Séjour;Semaine;${appState.reductions.semaine}%;${data.prixSejours.booking.semaine};${data.prixSejours.airbnb.semaine};${data.prixSejours.natuurhuisje.semaine};${Math.round(data.prixSejours.booking.pocheSemaine)};${Math.round(data.prixSejours.airbnb.pocheSemaine)};${Math.round(data.prixSejours.natuurhuisje.pocheSemaine)}\n`;

    // Estimations courtes durées
    const estItems = [
      { id: '1nuitWeekend', label: '1 nuit weekend' },
      { id: '1nuitMidweek', label: '1 nuit midweek' },
      { id: '2nuitsMidweek', label: '2 nuits midweek' },
      { id: '3nuitsMidweek', label: '3 nuits midweek' }
    ];
    estItems.forEach(({ id, label }) => {
      csv += `${nomSaison};Estimation;${label};;${data.estimations.booking[id].totalAffiche};${data.estimations.airbnb[id].totalAffiche};${data.estimations.natuurhuisje[id].totalAffiche};${Math.round(data.estimations.booking[id].poche)};${Math.round(data.estimations.airbnb[id].poche)};${Math.round(data.estimations.natuurhuisje[id].poche)}\n`;
    });
  });

  // Télécharger le fichier
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const filename = appState.nomGite
    ? `${appState.nomGite.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
    : `gite-pricing-${new Date().toISOString().split('T')[0]}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Synchroniser vers Jadore
function syncToJadore() {
  readFormValues();
  saveToStorage();

  // Lire l'état actuel de Jadore depuis localStorage
  const jadoreRaw = localStorage.getItem('jadorePricingState');
  const jadoreData = jadoreRaw ? JSON.parse(jadoreRaw) : {};

  // Syncer nom du gîte
  jadoreData.nomGite = appState.nomGite;

  // Syncer nettoyage TVAC → heures ménage
  const tarifHTVA = jadoreData.tarifMenageHTVA || 35;
  jadoreData.heuresMenage = Math.round((appState.nettoyage / (tarifHTVA * 1.21)) * 100) / 100;

  // Syncer prix souhaités (4 types)
  if (!jadoreData.prixPoche) jadoreData.prixPoche = {};
  ['bs', 'ms', 'hs'].forEach(s => {
    if (!jadoreData.prixPoche[s]) jadoreData.prixPoche[s] = {};
    jadoreData.prixPoche[s].weekend = appState.prixPoche[s].weekend;
    jadoreData.prixPoche[s].longweekend = appState.prixPoche[s].longweekend;
    jadoreData.prixPoche[s].midweek = appState.prixPoche[s].midweek;
    // Semaine : synchroniser la valeur calculée si des résultats existent
    if (appState.resultats && appState.resultats[s]) {
      jadoreData.prixPoche[s].semaine = Math.round(appState.resultats[s].prixSejours.booking.pocheSemaine);
    }
  });

  // Sauvegarder
  localStorage.setItem('jadorePricingState', JSON.stringify(jadoreData));

  // Feedback visuel
  const btn = document.getElementById('btn-sync');
  const originalText = btn.textContent;
  btn.textContent = '\u2713 Synchronis\u00e9 !';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = originalText;
    btn.disabled = false;
  }, 2000);
}
