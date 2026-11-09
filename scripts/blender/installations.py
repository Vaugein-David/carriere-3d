"""
Installations de la carrière SMBP de Viabon, dans le repère du plan (961 × 667, 1 unité ≈ 0,56 m).

Positions relevées sur l'orthophoto IGN recalée sur le plan, formes d'après les photos du site.
Les hauteurs des convoyeurs sont lues sur le MNS (sources/3d/surface.f32) quand `h` n'est pas donné :
`h` = (hauteur au départ, hauteur à l'arrivée) en mètres au-dessus du sol.
"""

# Convoyeurs : départ `a`, arrivée `b` (la tête, en général la plus haute), type de support
CONVEYORS = [
    # Tracé relevé sur le schéma de l'usine fourni par le site (vue nord en haut, calée sur les clarificateurs)
    # Alimentation de la trémie depuis les silos (au ras du sol, vers l'ouest)
    {'id': 'tremie', 'a': (598, 190), 'b': (158, 188), 'h': (3.0, 7.5), 'kind': 'gallery'},
    # Montées aux deux grands silos
    {'id': 'silo-1', 'a': (493, 318), 'b': (513, 192), 'kind': 'gallery'},
    {'id': 'silo-2', 'a': (514, 312), 'b': (536, 190), 'kind': 'gallery'},
    # Grands stockeurs vers le nord-est (deux galeries parallèles)
    {'id': 'ne-1', 'a': (565, 306), 'b': (706, 212), 'kind': 'gallery'},
    {'id': 'ne-2', 'a': (580, 310), 'b': (703, 214), 'kind': 'gallery'},
    # Deux galeries vers le grand tas de l'est, depuis la tour de transfert et depuis l'usine de lavage
    {'id': 'est-1', 'a': (620, 357), 'b': (752, 270), 'kind': 'gallery'},
    {'id': 'est-2', 'a': (615, 329), 'b': (752, 266), 'kind': 'gallery'},
    # Lignes est-ouest de l'usine (5 sur le schéma) : les deux plus au nord partent de la tour de transfert
    # vers le pied des montées aux silos, les trois autres desservent les stockeurs de l'ouest
    {'id': 'usine-1', 'a': (615, 312), 'b': (516, 312), 'h': (6.5, 4.0), 'kind': 'gallery'},
    {'id': 'usine-2', 'a': (615, 319), 'b': (491, 319), 'h': (6.0, 4.0), 'kind': 'gallery'},
    {'id': 'usine-3', 'a': (612, 331), 'b': (317, 333), 'h': (4.5, 3.5), 'kind': 'gallery'},
    {'id': 'usine-4', 'a': (606, 355), 'b': (274, 355), 'h': (4.0, 3.0), 'kind': 'gallery'},
    {'id': 'usine-5', 'a': (612, 366), 'b': (421, 366), 'h': (4.0, 3.0), 'kind': 'gallery'},
    # Liaison vers le stockeur sud-ouest
    {'id': 'liaison-so', 'a': (411, 333), 'b': (405, 367), 'h': (3.5, 3.0), 'kind': 'gallery'},
    # Ligne nord : montée vers le pivot du stockeur nord-ouest
    {'id': 'nord', 'a': (475, 302), 'b': (475, 250), 'h': (3.0, 6.5), 'kind': 'gallery'},
    {'id': 'nord-2', 'a': (467, 300), 'b': (440, 260), 'h': (3.0, 5.5), 'kind': 'gallery'},
    # Stockeurs radiaux (pivot -> tête au-dessus du tas)
    {'id': 'stockeur-1', 'a': (517, 339), 'b': (488, 396), 'kind': 'stacker'},
    {'id': 'stockeur-2', 'a': (520, 345), 'b': (532, 400), 'kind': 'stacker'},
    {'id': 'stockeur-3', 'a': (421, 366), 'b': (419, 426), 'kind': 'stacker'},
    {'id': 'stockeur-4', 'a': (405, 367), 'b': (362, 409), 'kind': 'stacker'},
    {'id': 'stockeur-5', 'a': (274, 355), 'b': (294, 409), 'kind': 'stacker'},
    {'id': 'stockeur-6', 'a': (315, 334), 'b': (297, 288), 'kind': 'stacker'},
    {'id': 'stockeur-7', 'a': (475, 250), 'b': (423, 252), 'kind': 'stacker'},
    # Usine de lavage -> tour de transfert, puis alimentation depuis l'extraction (au sud)
    {'id': 'lavage-sortie', 'a': (613, 354), 'b': (611, 336), 'h': (6.5, 7.5), 'kind': 'gallery'},
    {'id': 'extraction-2', 'a': (620, 488), 'b': (615, 410), 'h': (1.5, 9.0), 'kind': 'gallery'},
    {'id': 'extraction-3', 'a': (505, 690), 'b': (620, 488), 'h': (1.2, 2.0), 'kind': 'gallery'},
    # Centrale à béton : bande des granulats vers le malaxeur
    {'id': 'centrale', 'a': (588, 158), 'b': (618, 139), 'h': (1.0, 11.0), 'kind': 'gallery'},
]

# Grands silos noirs sur pieds, avec passerelle commune (photos « silos »)
BIG_SILOS = [(512, 185), (537, 183)]
BIG_SILO_RADIUS_M = 5.6

# Cases béton sous les silos (3 alvéoles)
BUNKERS = {'x0': 498, 'x1': 552, 'y0': 167, 'y1': 179, 'bays': 3, 'h_m': 5.0}

# Clarificateurs / épaississeurs (cuves rondes à eau verte) : centre, rayon (unités du plan), pont racleur
THICKENERS = [
    {'c': (533, 285), 'r': 14, 'bridge': True},
    {'c': (555, 279), 'r': 7, 'bridge': False},
    {'c': (657, 400), 'r': 15, 'bridge': True},
    {'c': (654, 426), 'r': 8, 'bridge': False},
]

# Tours de l'usine de traitement (cribles, hydrocyclones) : emprise et hauteur
# Bâtiments de l'usine, d'après la photo aérienne du site :
#   lavage  : plancher galvanisé sur poteaux, abri bardé au-dessus du tambour laveur, crible à toile orange,
#             capot incliné, hydrocyclones sur plateforme, tuyaux bleus (deux unités, une par clarificateur)
#   tremie  : grand caisson galvanisé rectangulaire sur poteaux, fond pyramidal, pompes bleues au pied
#   cribles : tour ouverte à deux planchers, cribles à moteurs rouges, goulottes
PLANT_TOWERS = [
    # axis : sens de la longueur ; feed : bout d'alimentation (tambour) côté + ou - de cet axe, crible à l'opposé
    {'type': 'lavage', 'x0': 500, 'x1': 528, 'y0': 330, 'y1': 346, 'h_m': 13, 'axis': 'x', 'feed': '-'},
    {'type': 'tremie', 'x0': 545, 'x1': 560, 'y0': 314, 'y1': 324, 'h_m': 13},
    # Usine de lavage principale (MNS : structure de 13 m, 9 × 29 m) au sud, alimentée par le convoyeur d'extraction
    {'type': 'lavage', 'x0': 607, 'x1': 624, 'y0': 357, 'y1': 410, 'h_m': 13, 'axis': 'y', 'feed': '+'},
]

# Bâtiments bardés (toit clair) : emprise, hauteur, couleur de bardage
BUILDINGS = [
    {'id': 'commande', 'x0': 574, 'x1': 595, 'y0': 247, 'y1': 271, 'h_m': 5.5, 'color': '#e9ebec'},
    {'id': 'conteneur-1', 'x0': 584, 'x1': 590, 'y0': 233, 'y1': 245, 'h_m': 2.8, 'color': '#f2f2f0'},
    {'id': 'smbp', 'x0': 670, 'x1': 690, 'y0': 405, 'y1': 415, 'h_m': 3.0, 'color': '#f4f4f2'},
    {'id': 'refectoire', 'x0': 98, 'x1': 128, 'y0': 136, 'y1': 145, 'h_m': 3.0, 'color': '#f1f1ee'},
    {'id': 'bureaux', 'x0': 103, 'x1': 125, 'y0': 124, 'y1': 132, 'h_m': 3.0, 'color': '#f1f1ee'},
    {'id': 'conteneurs', 'x0': 154, 'x1': 175, 'y0': 160, 'y1': 172, 'h_m': 2.8, 'color': '#d4d8dc'},
]

# Local « BUILD BETTER » à côté des clarificateurs : bâtiment bas avec un volume central plus haut (photo)
BUILD_BETTER = {'x0': 556, 'x1': 580, 'y0': 254, 'y1': 266}

# Hangar : deux nefs en arc noires sur murs de blocs béton (photos)
HANGAR = {'x0': 264, 'x1': 310, 'y0': 202, 'y1': 237, 'naves': 2, 'wall_m': 3.0, 'h_m': 10.5}

# Trémie de chargement : bâtiment bardé sur passage couvert en béton + silos blancs (photo trémie)
TREMIE = {'x0': 150, 'x1': 172, 'y0': 178, 'y1': 199, 'silos': [(176, 172, 2.4, 17), (184, 170, 3.2, 14), (192, 170, 3.2, 14)]}

# Usine à boues : filtre-presse sur passage couvert, cuve ronde, silos blancs
BOUES = {
    'building': {'x0': 735, 'x1': 762, 'y0': 380, 'y1': 410, 'h_m': 12},
    'tank': {'c': (749, 346), 'r': 12, 'h_m': 3.5},
    'silos': [(744, 372, 3.5, 18), (758, 372, 3.5, 18), (735, 365, 2.5, 15)],
}

# Centrale à béton : silos à bande rouge, tour de malaxage, trémies à granulats
CENTRALE = {
    'tower': {'x0': 614, 'x1': 630, 'y0': 128, 'y1': 146, 'h_m': 14},
    'silos': [(637, 124, 3.2, 19), (637, 133, 3.2, 19), (637, 142, 3.2, 19), (612, 116, 2.8, 14), (620, 116, 2.8, 14)],
    'hoppers': {'x0': 578, 'x1': 606, 'y0': 150, 'y1': 162},
}

# Pont-bascule et laveur de roues (côté route)
BASCULE = {'x0': 893, 'x1': 908, 'y0': 312, 'y1': 390}
LAVEUR = {'x0': 890, 'x1': 905, 'y0': 258, 'y1': 300}

# Rangée de peupliers le long de la route (bord est du plan)
POPLARS = {'x': 909, 'y0': 40, 'y1': 700, 'step': 9}

# Engins : (type, x, y, cap en degrés, 0 = vers le haut du plan)
VEHICLES = [
    ('dumper', 108, 84, 180), ('dumper', 122, 84, 180), ('dumper', 136, 86, 170),
    ('chargeur', 445, 440, 210), ('chargeur', 300, 455, 40), ('chargeur', 540, 205, 90),
    ('camion', 166, 189, 270), ('camion', 700, 60, 270), ('camion', 340, 124, 270), ('camion', 180, 300, 180),
    ('pelle', 640, 600, 30), ('pelle', 250, 520, 120),
    ('nacelle', 486, 200, 90), ('nacelle', 492, 208, 70),
]

# Rangées de gros blocs calcaires le long des pistes (pointillés visibles sur l'orthophoto)
BOULDER_ROWS = [
    [(15, 330), (15, 72), (60, 68), (870, 66), (874, 300)],
    [(330, 33), (640, 33)],
]

# Mâts d'éclairage autour de l'usine
LIGHT_MASTS = [(455, 250), (640, 285), (560, 425), (330, 300), (700, 330)]

# Conteneurs : x, y, orientation (degrés), couleur
CONTAINERS = [(470, 205, 0, 'gris'), (470, 211, 0, 'gris'), (127, 128, 0, 'bleu'), (580, 226, 90, 'gris')]

# Tas de tuyaux rouges (photo des stockeurs)
PIPES = [(560, 410)]

# Zones de structures denses (usine, silos, centrale…) : le sol y est aplani au niveau environnant,
# car le relief filtré y garde des « blocs » formés par les convoyeurs et charpentes rapprochés
FLATTEN = [
    {'x0': 493, 'x1': 560, 'y0': 163, 'y1': 206},   # grands silos et cases béton
    {'x0': 460, 'x1': 628, 'y0': 300, 'y1': 350},   # cœur de l'usine de traitement
    {'x0': 515, 'x1': 578, 'y0': 262, 'y1': 300},   # clarificateur nord
    {'x0': 635, 'x1': 700, 'y0': 378, 'y1': 440},   # clarificateur sud et local SMBP
    {'x0': 700, 'x1': 770, 'y0': 330, 'y1': 415},   # usine à boues
    {'x0': 570, 'x1': 660, 'y0': 100, 'y1': 170},   # centrale à béton
    {'x0': 145, 'x1': 200, 'y0': 160, 'y1': 205},   # trémie
]

