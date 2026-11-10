"""
Menu démonstratif inspiré de la gastronomie algérienne et française.
Ce fichier respecte strictement les 3 périodes de repas et la hiérarchie exacte des 20 catégories.
Devise : Dinar Algérien (DA).
"""

CURRENCY_CODE = "DA"
CURRENCY_SYMBOL = "DA"

SEED_MENU = [
    {
        "meal_period": "Breakfast",
        "categories": [
            {
                "id": "CAT-B-1",
                "name": "Beverages / Liquid Start",
                "display_order": 1,
                "items": [
                    {
                        "id": "ITEM-B-101",
                        "name": "Jus d'Orange Pressé Frais",
                        "description": "Oranges fraîches pressées à la minute avec pulpe naturelle",
                        "price": 350.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-B-102",
                        "name": "Café Crème Traditionnel (Kahwa)",
                        "description": "Café torréfié maison servi avec mousse de lait onctueuse ou café noir traditionnel",
                        "price": 250.0,
                        "is_available": 1,
                    },
                ],
            },
            {
                "id": "CAT-B-2",
                "name": "Fruit & Bakery",
                "display_order": 2,
                "items": [
                    {
                        "id": "ITEM-B-201",
                        "name": "Msemen Chaud au Beurre & Miel",
                        "description": "Feuilleté traditionnel croustillant nappé de pur miel d'oranger et beurre fondu",
                        "price": 400.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-B-202",
                        "name": "Croissant Artisanal & Confiture de Figues",
                        "description": "Croissant pur beurre feuilleté servi avec confiture artisanale de figues locales",
                        "price": 350.0,
                        "is_available": 1,
                    },
                ],
            },
            {
                "id": "CAT-B-3",
                "name": "Cereals & Grains",
                "display_order": 3,
                "items": [
                    {
                        "id": "ITEM-B-301",
                        "name": "Tamina Dorée aux Amandes",
                        "description": "Semoule fine torréfiée au miel et beurre doux, saupoudrée de cannelle et amandes grillées",
                        "price": 500.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-B-302",
                        "name": "Gruau d'Avoine aux Dattes Deglet Nour",
                        "description": "Flocons d'avoine au lait chaud, morceaux de dattes mielleuses et graines de sésame",
                        "price": 450.0,
                        "is_available": 1,
                    },
                ],
            },
            {
                "id": "CAT-B-4",
                "name": "Main Plates",
                "display_order": 4,
                "items": [
                    {
                        "id": "ITEM-B-401",
                        "name": "Chakchouka Traditionnelle aux Œufs",
                        "description": "Poivrons doux et tomates mijotés aux épices, œufs fermiers pochés et pain Kesra chaud",
                        "price": 750.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-B-402",
                        "name": "Omelette Fermière au Fromage & Khlii",
                        "description": "Omelette baveuse aux herbes fraîches, fromage fondant et fines lamelles de viande séchée",
                        "price": 850.0,
                        "is_available": 1,
                    },
                ],
            },
        ],
    },
    {
        "meal_period": "Lunch",
        "categories": [
            {
                "id": "CAT-L-1",
                "name": "Appetizer / Starter",
                "display_order": 1,
                "items": [
                    {
                        "id": "ITEM-L-101",
                        "name": "Bourek Croustillant à la Viande Hachée",
                        "description": "Feuilles de dioul dorées farcies au bœuf haché assaisonné, persil, oignons et fromage",
                        "price": 650.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-L-102",
                        "name": "Salade Méchouia aux Poivrons Braisés",
                        "description": "Poivrons et tomates grillés au feu de bois, ail, huile d'olive vierge et œufs durs",
                        "price": 600.0,
                        "is_available": 1,
                    },
                ],
            },
            {
                "id": "CAT-L-2",
                "name": "Main Course",
                "display_order": 2,
                "items": [
                    {
                        "id": "ITEM-L-201",
                        "name": "Couscous Royal à l'Agneau & Légumes",
                        "description": "Semoule fine roulée à la main, jarret d'agneau tendre, pois chiches et légumes mijotés",
                        "price": 1950.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-L-202",
                        "name": "Tajine Zitoun au Poulet Rôti",
                        "description": "Cuisses de poulet fermier mijotées aux olives vertes, champignons et sauce parfumée",
                        "price": 1650.0,
                        "is_available": 1,
                    },
                ],
            },
            {
                "id": "CAT-L-3",
                "name": "Sides",
                "display_order": 3,
                "items": [
                    {
                        "id": "ITEM-L-301",
                        "name": "Frites Maison aux Épices & Paprika",
                        "description": "Pommes de terre fraîches coupées à la main, sel marin et mélange d'épices douces",
                        "price": 400.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-L-302",
                        "name": "Batata Chtitha (Pommes de Terre Mijotées)",
                        "description": "Pommes de terre fondantes en sauce rouge aillée au cumin et piment doux",
                        "price": 450.0,
                        "is_available": 1,
                    },
                ],
            },
            {
                "id": "CAT-L-4",
                "name": "Dessert",
                "display_order": 4,
                "items": [
                    {
                        "id": "ITEM-L-401",
                        "name": "Crème Caramel à la Fleur d'Oranger",
                        "description": "Flan onctueux parfumé à l'eau de fleur d'oranger et caramel doré fait maison",
                        "price": 500.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-L-402",
                        "name": "Fondant Chaud au Chocolat Noir",
                        "description": "Gâteau au chocolat noir avec cœur coulant, accompagné d'une glace vanille",
                        "price": 650.0,
                        "is_available": 1,
                    },
                ],
            },
        ],
    },
    {
        "meal_period": "Dinner & Full-Course Meal",
        "categories": [
            {
                "id": "CAT-D-1",
                "name": "Hors d’œuvre",
                "display_order": 1,
                "items": [
                    {
                        "id": "ITEM-D-101",
                        "name": "Mini Pastillas au Poulet & Amandes",
                        "description": "Feuilleté doré croustillant, poulet effiloché aux épices, cannelle et amandes pilées",
                        "price": 850.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-D-102",
                        "name": "Feuillantine de Crevettes à la Chermoula",
                        "description": "Crevettes sautées aux herbes fraîches, ail et paprika sur toast brioché",
                        "price": 900.0,
                        "is_available": 1,
                    },
                ],
            },
            {
                "id": "CAT-D-2",
                "name": "Amuse-bouche",
                "display_order": 2,
                "items": [
                    {
                        "id": "ITEM-D-201",
                        "name": "Velouté Glacé de Courgettes à la Menthe",
                        "description": "Petite émulsion légère de courgettes de saison, menthe fraîche et crème acidulée",
                        "price": 450.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-D-202",
                        "name": "Canapé de Sardines Marinées",
                        "description": "Filet de sardine fraîche de Méditerranée marinée au citron et huile d'olive sur pain grillé",
                        "price": 500.0,
                        "is_available": 1,
                    },
                ],
            },
            {
                "id": "CAT-D-3",
                "name": "Soup",
                "display_order": 3,
                "items": [
                    {
                        "id": "ITEM-D-301",
                        "name": "Chorba Frik Traditionnelle à l'Agneau",
                        "description": "Soupe authentique au blé vert concassé, viande d'agneau tendre, coriandre et menthe",
                        "price": 850.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-D-302",
                        "name": "Chorba Beida Blanche au Poulet",
                        "description": "Soupe blanche délicate au poulet fermier, pois chiches, vermicelles et filet de citron",
                        "price": 800.0,
                        "is_available": 1,
                    },
                ],
            },
            {
                "id": "CAT-D-4",
                "name": "Appetizer / Starter",
                "display_order": 4,
                "items": [
                    {
                        "id": "ITEM-D-401",
                        "name": "Foie Gras Poêlé aux Figues Rôties",
                        "description": "Escalope de foie gras poêlée, confit de figues locales et réduction balsamique",
                        "price": 1800.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-D-402",
                        "name": "Tartare de Thon Rouge de Méditerranée",
                        "description": "Thon frais coupé au couteau, agrumes, câpres, échalotes et huile d'olive vierge",
                        "price": 1500.0,
                        "is_available": 1,
                    },
                ],
            },
            {
                "id": "CAT-D-5",
                "name": "Salad",
                "display_order": 5,
                "items": [
                    {
                        "id": "ITEM-D-501",
                        "name": "Salade d'Agrumes & Roquette au Fromage Frais",
                        "description": "Agrumes de saison, pousses de roquette sauvage, noix grillées et vinaigrette au miel",
                        "price": 750.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-D-502",
                        "name": "Salade Gourmande de Tomates & Olives Noires",
                        "description": "Tomates de jardin mûres à point, olives noires marinées, oignons doux et basilic",
                        "price": 700.0,
                        "is_available": 1,
                    },
                ],
            },
            {
                "id": "CAT-D-6",
                "name": "Fish / Seafood Course",
                "display_order": 6,
                "items": [
                    {
                        "id": "ITEM-D-601",
                        "name": "Pavé de Loup de Mer Grillé au Fenouil",
                        "description": "Loup de mer poêlé côté peau, tombée de fenouil sauvage et émulsion citronnée",
                        "price": 2400.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-D-602",
                        "name": "Gambas Royales Sautées à l'Ail & Anis",
                        "description": "Grosses crevettes royales poêlées, persillade fraîche et pointe anisée",
                        "price": 2600.0,
                        "is_available": 1,
                    },
                ],
            },
            {
                "id": "CAT-D-7",
                "name": "Palate Cleanser",
                "display_order": 7,
                "items": [
                    {
                        "id": "ITEM-D-701",
                        "name": "Sorbet Givré au Citron & Menthe",
                        "description": "Sorbet artisanal rafraîchissant au citron de plaine et feuilles de menthe pilées",
                        "price": 400.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-D-702",
                        "name": "Granité Clémentine & Eau de Rose",
                        "description": "Glace pilée parfumée à la clémentine douce et délicates notes de rose",
                        "price": 450.0,
                        "is_available": 1,
                    },
                ],
            },
            {
                "id": "CAT-D-8",
                "name": "Main Course",
                "display_order": 8,
                "items": [
                    {
                        "id": "ITEM-D-801",
                        "name": "Chakhchoukha de Biskra à l'Agneau",
                        "description": "Pâte traditionnelle émiettée à la main, sauce rouge mijotée, agneau fondant et pois chiches",
                        "price": 2200.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-D-802",
                        "name": "Souris d'Agneau Confite au Romarin",
                        "description": "Souris d'agneau confite 7 heures au four, purée de pommes de terre à l'huile d'olive et jus corsé",
                        "price": 2500.0,
                        "is_available": 1,
                    },
                ],
            },
            {
                "id": "CAT-D-9",
                "name": "Cheese Course",
                "display_order": 9,
                "items": [
                    {
                        "id": "ITEM-D-901",
                        "name": "Sélection de Fromages de Brebis & Chèvre",
                        "description": "Fromages artisanaux affinés servis avec miel de thym, noix et pain aux graines",
                        "price": 1100.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-D-902",
                        "name": "Fromage Frais Maison à l'Huile d'Olive & Zaatar",
                        "description": "Fromage frais crémeux égoutté, filet d'huile d'olive vierge et mélange d'herbes sauvages",
                        "price": 950.0,
                        "is_available": 1,
                    },
                ],
            },
            {
                "id": "CAT-D-10",
                "name": "Dessert",
                "display_order": 10,
                "items": [
                    {
                        "id": "ITEM-D-1001",
                        "name": "Mille-Feuille Croustillant Vanille & Praliné",
                        "description": "Feuilletage croustillant pur beurre, crème vanille légère et praliné amandes maison",
                        "price": 850.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-D-1002",
                        "name": "Tartelette Sablée aux Fraises & Pistache",
                        "description": "Pâte sablée croquante, crème mousseline à la pistache d'Algérie et fraises fraîches",
                        "price": 800.0,
                        "is_available": 1,
                    },
                ],
            },
            {
                "id": "CAT-D-11",
                "name": "Mignardises / Petit Fours",
                "display_order": 11,
                "items": [
                    {
                        "id": "ITEM-D-1101",
                        "name": "Trio de Pâtisseries Fines (Baklawa, Cornes de Gazelle, Samsa)",
                        "description": "Mignardises traditionnelles aux amandes, miel pur et eau de fleur d'oranger",
                        "price": 650.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-D-1102",
                        "name": "Truffes Fondantes au Chocolat Noir 70%",
                        "description": "Ganache onctueuse roulée dans du cacao amer",
                        "price": 550.0,
                        "is_available": 1,
                    },
                ],
            },
            {
                "id": "CAT-D-12",
                "name": "Digestif & Beverages",
                "display_order": 12,
                "items": [
                    {
                        "id": "ITEM-D-1201",
                        "name": "Thé à la Menthe Traditionnel aux Pignons",
                        "description": "Thé vert gunpowder infusé à la menthe fraîche, servi mousseux avec pignons de pin torréfiés",
                        "price": 350.0,
                        "is_available": 1,
                    },
                    {
                        "id": "ITEM-D-1202",
                        "name": "Infusion Verveine Sauvage & Fleur d'Oranger",
                        "description": "Infusion relaxante de feuilles de verveine entières et eau florale de néroli",
                        "price": 300.0,
                        "is_available": 1,
                    },
                ],
            },
        ],
    },
]
