#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Domain term/phrase dictionary for Lake Group site translations (EN -> FR, EN -> PT).
Ordered roughly longest-phrase-first within each section so substitution
passes match whole phrases before falling back to individual words.
"""

# Whole-phrase translations (exact, case-sensitive match on the full string
# after light whitespace normalization). These take priority over anything
# else and are used for full sentences / headings / taglines that deserve
# hand-crafted, natural translations rather than mechanical substitution.
PHRASES_FR = {
    "Welcome to a diverse pioneer in fuel marketing, haulage, LPG bottling, cylinder manufacturing and concrete production. With experienced engineers and business professionals across our divisions, we are fully geared to meet the demands of the global marketplace.":
        "Bienvenue chez un pionnier diversifié de la commercialisation de carburant, du transport, de l'embouteillage de GPL, de la fabrication de bouteilles et de la production de béton. Avec des ingénieurs expérimentés et des professionnels dans toutes nos divisions, nous sommes pleinement équipés pour répondre aux exigences du marché mondial.",
    "Welcome to a diverse pioneer in fuel marketing, haulage, LPG bottling, cylinder manufacturing and concrete production. With our experienced team across all business units, we are fully geared to meet the demands of the global marketplace.":
        "Bienvenue chez un pionnier diversifié de la commercialisation de carburant, du transport, de l'embouteillage de GPL, de la fabrication de bouteilles et de la production de béton. Avec notre équipe expérimentée dans toutes nos unités d'affaires, nous sommes pleinement équipés pour répondre aux exigences du marché mondial.",
    "With a team of experienced engineers and business professionals across our units, Lake Group is fully geared to meet the demands of the global marketplace, from fuel marketing and haulage to LPG, steel, lubricants and concrete.":
        "Avec une équipe d'ingénieurs expérimentés et de professionnels dans toutes nos unités, Lake Group est pleinement équipé pour répondre aux exigences du marché mondial, de la commercialisation de carburant et du transport au GPL, à l'acier, aux lubrifiants et au béton.",
    "One of Africa's fastest-growing energy, logistics & construction conglomerates, operating across 8 countries with 4,600+ employees and 700+ trucks on the road.":
        "L'un des conglomérats d'énergie, de logistique et de construction à la croissance la plus rapide d'Afrique, présent dans 8 pays avec plus de 4 600 employés et plus de 700 camions sur les routes.",
    "Founded by CEO & Chairman Ally Edha Awadh in 2006 at just 27 years old, Lake Group has grown from a single fuel outlet into one of East and Central Africa's largest energy, logistics and industrial conglomerates.":
        "Fondé par le PDG et président Ally Edha Awadh en 2006, à seulement 27 ans, Lake Group est passé d'une seule station-service à l'un des plus grands conglomérats d'énergie, de logistique et industriels d'Afrique de l'Est et centrale.",
    "Today, with 4,600+ employees across 21 nationalities, 700+ trucks, 85+ fuel stations and 20+ subsidiaries, Lake Group powers everyday life across Tanzania, Kenya, Zambia, Rwanda, Burundi, DRC, Ethiopia and Mozambique.":
        "Aujourd'hui, avec plus de 4 600 employés de 21 nationalités, plus de 700 camions, plus de 85 stations-service et plus de 20 filiales, Lake Group alimente la vie quotidienne en Tanzanie, au Kenya, en Zambie, au Rwanda, au Burundi, en RDC, en Éthiopie et au Mozambique.",
    "Every litre Lake Group delivers follows the same journey: refined petroleum flowing through our network to storage terminals and fuel stations across East and Central Africa.":
        "Chaque litre livré par Lake Group suit le même parcours : du pétrole raffiné qui circule dans notre réseau jusqu'aux terminaux de stockage et aux stations-service d'Afrique de l'Est et centrale.",
    "From fuel stations to steel mills, Lake Group operates across the full energy and industrial value chain of East Africa.":
        "Des stations-service aux aciéries, Lake Group est présent sur toute la chaîne de valeur énergétique et industrielle de l'Afrique de l'Est.",
    "4,600+ jobs across 8 countries, with a strong preference for hiring and developing local talent at every level of the organisation.":
        "Plus de 4 600 emplois dans 8 pays, avec une forte préférence pour le recrutement et le développement des talents locaux à tous les niveaux de l'organisation.",
    "700+ truck fleet providing bulk liquid transport and regional cargo haulage across East and Central Africa.":
        "Une flotte de plus de 700 camions assurant le transport de liquides en vrac et le transport régional de marchandises en Afrique de l'Est et centrale.",
    "700+ truck logistics fleet for petroleum, dry cargo and cross-border haulage across East Africa.":
        "Une flotte logistique de plus de 700 camions pour le pétrole, le fret sec et le transport transfrontalier en Afrique de l'Est.",
    "Lake Oil Ltd. is the flagship company of Lake Group and one of Tanzania's top 5 distributors of petroleum products. Founded in 2006, it has established a strong footprint across all of East and Central Africa.":
        "Lake Oil Ltd. est la société phare de Lake Group et l'un des 5 plus grands distributeurs de produits pétroliers de Tanzanie. Fondée en 2006, elle s'est solidement implantée dans toute l'Afrique de l'Est et centrale.",
    "We supply white petroleum products including petrol, diesel and aviation fuel through retail stations, bulk delivery and strategic storage facilities across the region.":
        "Nous fournissons des produits pétroliers blancs, dont l'essence, le diesel et le carburant aviation, via des stations-service, la livraison en vrac et des installations de stockage stratégiques dans toute la région.",
    "20 truck mixers (12m³ each) dedicated to GCCP ready-mix concrete delivery to construction sites across Dar es Salaam.":
        "20 camions-toupies (12 m³ chacun) dédiés à la livraison de béton prêt à l'emploi GCCP sur les chantiers de Dar es Salaam.",
    "Welcome back, ": "Bienvenue, ",
    "Est. 2006 · Dar es Salaam, Tanzania": "Fondé en 2006 · Dar es Salaam, Tanzanie",
    "Est. 2006": "Fondé en 2006",
    "Powering East & <em>Central Africa</em>": "Propulser l'Afrique de l'Est & <em>centrale</em>",
}

PHRASES_PT = {
    "Welcome to a diverse pioneer in fuel marketing, haulage, LPG bottling, cylinder manufacturing and concrete production. With experienced engineers and business professionals across our divisions, we are fully geared to meet the demands of the global marketplace.":
        "Bem-vindo a um pioneiro diversificado na comercialização de combustíveis, transporte, engarrafamento de GLP, fabrico de cilindros e produção de betão. Com engenheiros experientes e profissionais de negócios em todas as nossas divisões, estamos totalmente preparados para responder às exigências do mercado global.",
    "Welcome to a diverse pioneer in fuel marketing, haulage, LPG bottling, cylinder manufacturing and concrete production. With our experienced team across all business units, we are fully geared to meet the demands of the global marketplace.":
        "Bem-vindo a um pioneiro diversificado na comercialização de combustíveis, transporte, engarrafamento de GLP, fabrico de cilindros e produção de betão. Com a nossa equipa experiente em todas as unidades de negócio, estamos totalmente preparados para responder às exigências do mercado global.",
    "With a team of experienced engineers and business professionals across our units, Lake Group is fully geared to meet the demands of the global marketplace, from fuel marketing and haulage to LPG, steel, lubricants and concrete.":
        "Com uma equipa de engenheiros experientes e profissionais de negócios em todas as nossas unidades, o Lake Group está totalmente preparado para responder às exigências do mercado global, desde a comercialização de combustíveis e transporte até GLP, aço, lubrificantes e betão.",
    "One of Africa's fastest-growing energy, logistics & construction conglomerates, operating across 8 countries with 4,600+ employees and 700+ trucks on the road.":
        "Um dos conglomerados de energia, logística e construção que mais cresce em África, presente em 8 países com mais de 4.600 colaboradores e mais de 700 camiões em circulação.",
    "Founded by CEO & Chairman Ally Edha Awadh in 2006 at just 27 years old, Lake Group has grown from a single fuel outlet into one of East and Central Africa's largest energy, logistics and industrial conglomerates.":
        "Fundado pelo CEO e Presidente Ally Edha Awadh em 2006, com apenas 27 anos, o Lake Group cresceu de um único posto de combustível para um dos maiores conglomerados de energia, logística e industriais da África Oriental e Central.",
    "Today, with 4,600+ employees across 21 nationalities, 700+ trucks, 85+ fuel stations and 20+ subsidiaries, Lake Group powers everyday life across Tanzania, Kenya, Zambia, Rwanda, Burundi, DRC, Ethiopia and Mozambique.":
        "Hoje, com mais de 4.600 colaboradores de 21 nacionalidades, mais de 700 camiões, mais de 85 postos de combustível e mais de 20 subsidiárias, o Lake Group impulsiona o dia a dia na Tanzânia, Quénia, Zâmbia, Ruanda, Burundi, RDC, Etiópia e Moçambique.",
    "Every litre Lake Group delivers follows the same journey: refined petroleum flowing through our network to storage terminals and fuel stations across East and Central Africa.":
        "Cada litro entregue pelo Lake Group segue o mesmo percurso: petróleo refinado a fluir pela nossa rede até terminais de armazenamento e postos de combustível em toda a África Oriental e Central.",
    "From fuel stations to steel mills, Lake Group operates across the full energy and industrial value chain of East Africa.":
        "Dos postos de combustível às siderúrgicas, o Lake Group opera em toda a cadeia de valor energética e industrial da África Oriental.",
    "4,600+ jobs across 8 countries, with a strong preference for hiring and developing local talent at every level of the organisation.":
        "Mais de 4.600 empregos em 8 países, com forte preferência pela contratação e desenvolvimento de talento local em todos os níveis da organização.",
    "700+ truck fleet providing bulk liquid transport and regional cargo haulage across East and Central Africa.":
        "Uma frota de mais de 700 camiões que assegura o transporte de líquidos a granel e o transporte regional de carga em toda a África Oriental e Central.",
    "700+ truck logistics fleet for petroleum, dry cargo and cross-border haulage across East Africa.":
        "Uma frota logística de mais de 700 camiões para petróleo, carga seca e transporte transfronteiriço na África Oriental.",
    "Lake Oil Ltd. is the flagship company of Lake Group and one of Tanzania's top 5 distributors of petroleum products. Founded in 2006, it has established a strong footprint across all of East and Central Africa.":
        "A Lake Oil Ltd. é a empresa principal do Lake Group e um dos 5 maiores distribuidores de produtos petrolíferos da Tanzânia. Fundada em 2006, estabeleceu uma forte presença em toda a África Oriental e Central.",
    "We supply white petroleum products including petrol, diesel and aviation fuel through retail stations, bulk delivery and strategic storage facilities across the region.":
        "Fornecemos produtos petrolíferos brancos, incluindo gasolina, gasóleo e combustível de aviação, através de postos de venda, entrega a granel e instalações de armazenamento estratégicas em toda a região.",
    "20 truck mixers (12m³ each) dedicated to GCCP ready-mix concrete delivery to construction sites across Dar es Salaam.":
        "20 camiões-betoneira (12 m³ cada) dedicados à entrega de betão pronto GCCP em obras em toda a Dar es Salaam.",
    "Welcome back, ": "Bem-vindo de volta, ",
    "Est. 2006 · Dar es Salaam, Tanzania": "Fundada em 2006 · Dar es Salaam, Tanzânia",
    "Est. 2006": "Fundada em 2006",
    "Powering East & <em>Central Africa</em>": "Impulsionando a África Oriental & <em>Central</em>",
}

# Single-word / short-phrase term dictionary. Applied with word-boundary
# regex substitution after PHRASES_* exact matches fail, longest-key-first.
TERMS_FR = {
    "Fuel & Petroleum Distribution": "Distribution de carburant et de pétrole",
    "Fuel & Petroleum": "Carburant et pétrole",
    "Transport & Haulage": "Transport et acheminement",
    "Concrete & Aggregate": "Béton et granulats",
    "CSR & Sustainability": "RSE et durabilité",
    "Container Services": "Services de conteneurs",
    "Africa Operations Map": "Carte des opérations en Afrique",
    "Station Locator": "Localisateur de stations",
    "Our Fleet": "Notre flotte",
    "Our History": "Notre histoire",
    "Investor Relations": "Relations investisseurs",
    "Major Projects": "Grands projets",
    "Track Shipment": "Suivre l'expédition",
    "Get a Quote": "Demander un devis",
    "About Us": "À propos de nous",
    "Quality, Service, Safety, Professionalism": "Qualité, service, sécurité, professionnalisme",
    "All rights reserved.": "Tous droits réservés.",
    "Lake Group Assistant": "Assistant Lake Group",
    "Ask us anything": "Posez-nous vos questions",
    "Hello! How can I help you today?": "Bonjour ! Comment puis-je vous aider aujourd'hui ?",
    "Type a message...": "Tapez un message...",
    "Keeping Africa Moving": "Faire avancer l'Afrique",
    "Operations by Country": "Opérations par pays",
    "Quick Links": "Liens rapides",
    "Why Choose Lake Oil": "Pourquoi choisir Lake Oil",
    "Our Competitive Edge": "Notre avantage concurrentiel",
    "Top 5 in Tanzania": "Top 5 en Tanzanie",
    "Ranked among the top 5 petroleum distributors in Tanzania by volume.": "Classé parmi les 5 premiers distributeurs de pétrole en Tanzanie par volume.",
    "Own Storage": "Stockage propre",
    "Strategic storage facilities in Tanzania, Kenya, Burundi and DRC.": "Installations de stockage stratégiques en Tanzanie, au Kenya, au Burundi et en RDC.",
    "700+ Trucks": "Plus de 700 camions",
    "Integrated logistics fleet for reliable, on-time delivery every time.": "Flotte logistique intégrée pour une livraison fiable et ponctuelle à chaque fois.",
    "8 Countries": "8 pays",
    "Pan-African fuel supply capability across East and Central Africa.": "Capacité d'approvisionnement en carburant panafricaine en Afrique de l'Est et centrale.",
    "Request Fuel Supply Quote": "Demander un devis d'approvisionnement",
    "Find a Station": "Trouver une station",
    "Track Delivery": "Suivre la livraison",
    "Energy": "Énergie", "Industry": "Industrie", "Logistics": "Logistique",
    "Services": "Services", "Network": "Réseau", "Company": "Entreprise",
    "News": "Actualités", "Careers": "Carrières", "Contact": "Contact",
    "About": "À propos", "Home": "Accueil", "Gallery": "Galerie",
    "Leadership": "Direction", "History": "Histoire", "Investors": "Investisseurs",
    "Projects": "Projets", "More": "Plus", "Privacy": "Confidentialité", "Terms": "Conditions",
    "Send": "Envoyer", "View": "Voir", "Apply": "Postuler", "Review": "Examiner",
    "Date": "Date", "Status": "Statut", "Phone": "Téléphone", "Email": "E-mail",
    "Today": "Aujourd'hui", "Other": "Autre", "Account": "Compte", "Sign In": "Connexion",
    "Service": "Service", "Product": "Produit", "Origin": "Origine",
    "Employees": "Employés", "Trucks": "Camions", "Fuel Stations": "Stations-service",
    "Countries": "Pays", "Subsidiaries": "Filiales", "Subsidiary": "Filiale",
    "Delivered": "Livré", "In Transit": "En transit", "Open Now": "Ouvert maintenant",
    "Learn more →": "En savoir plus →",
    "Lake Steel": "Lake Steel", "LPG Gas": "Gaz GPL", "Lubricants": "Lubrifiants",
    "Tanzania": "Tanzanie", "Kenya": "Kenya", "Zambia": "Zambie", "Rwanda": "Rwanda",
    "Burundi": "Burundi", "DRC": "RDC", "Ethiopia": "Éthiopie", "Mozambique": "Mozambique",
    "Dubai": "Dubaï",
    "Services ▾": "Services ▾", "Network ▾": "Réseau ▾", "Company ▾": "Entreprise ▾",
    "Fuel": "Carburant", "Steel": "Acier", "Concrete": "Béton", "Transport": "Transport",
    "Containers": "Conteneurs", "Africa Map": "Carte Afrique", "CSR": "RSE",
    "Track": "Suivi",
    # --- Expanded coverage ---
    "About Lake Group": "À propos de Lake Group",
    "Our Company": "Notre entreprise",
    "Company Profile": "Profil de l'entreprise",
    "Company Overview": "Aperçu de l'entreprise",
    "Company News": "Actualités de l'entreprise",
    "Latest News": "Dernières actualités",
    "Latest Stories": "Dernières histoires",
    "Latest Announcements": "Dernières annonces",
    "News & Events": "Actualités et événements",
    "Press Release": "Communiqué de presse",
    "All topics": "Tous les sujets",
    "All countries": "Tous les pays",
    "All services": "Tous les services",
    "All (39)": "Tous (39)",
    "Filter by service": "Filtrer par service",
    "Search news...": "Rechercher des actualités...",
    "Display currency:": "Devise d'affichage :",
    "Headquarters": "Siège social",
    "Group Leadership": "Direction du groupe",
    "Leadership Team": "Équipe de direction",
    "Full Leadership Team": "Équipe de direction complète",
    "Group CEO & Chairman": "PDG et président du groupe",
    "CEO & Chairman": "PDG et président",
    "CEO Message": "Message du PDG",
    "Executive Director · Lake Group": "Directeur exécutif · Lake Group",
    "Human Resources Director · Lake Oil": "Directrice des ressources humaines · Lake Oil",
    "Finance Manager": "Directeur financier",
    "Civil Engineer": "Ingénieur civil",
    "HR / Admin": "RH / Administration",
    "Group & Lake Oil Management": "Direction du groupe et de Lake Oil",
    "Business Units": "Unités d'affaires",
    "Companies Under Lake Group": "Sociétés du groupe Lake Group",
    "A Word from Our Founder": "Un mot de notre fondateur",
    "A Conglomerate Built on Grit and Vision": "Un conglomérat bâti sur la détermination et la vision",
    "Founded Lake Group at age 27 in 2006": "A fondé Lake Group à 27 ans en 2006",
    "From a Single Fuel Company to a Regional Powerhouse": "D'une simple société pétrolière à une puissance régionale",
    "From 1 company in 2006 to 20+ subsidiaries, a track record of disciplined expansion and value creation over 18 years.":
        "D'une seule entreprise en 2006 à plus de 20 filiales : un parcours d'expansion disciplinée et de création de valeur sur 18 ans.",
    "From a single fuel station to a pan-African conglomerate, the journey of Lake Group since 2006.":
        "D'une seule station-service à un conglomérat panafricain : le parcours de Lake Group depuis 2006.",
    "18 Years of Growth": "18 années de croissance",
    "A Track Record of Vertical Growth": "Un parcours de croissance verticale",
    "Building East Africa's Future": "Construire l'avenir de l'Afrique de l'Est",
    "Be Part of the Next Chapter": "Faites partie du prochain chapitre",
    "Join Our Team": "Rejoignez notre équipe",
    "Join the Team": "Rejoignez l'équipe",
    "Explore Careers": "Découvrir les carrières",
    "Careers at Lake Group": "Carrières chez Lake Group",
    "Apply Now": "Postuler maintenant",
    "General Application": "Candidature spontanée",
    "Drop Us Your CV": "Envoyez-nous votre CV",
    "Career Growth": "Évolution de carrière",
    "Diverse Teams": "Équipes diversifiées",
    "A culture we cherish": "Une culture que nous chérissons",
    "Build Your Career Across Africa": "Construisez votre carrière à travers l'Afrique",
    "Cross-country and cross-division advancement opportunities": "Opportunités d'évolution entre pays et divisions",
    "Even if no specific role matches your profile, we welcome speculative applications from talented professionals.":
        "Même si aucun poste spécifique ne correspond à votre profil, nous accueillons les candidatures spontanées de professionnels talentueux.",
    "Education": "Éducation",
    "Education & Skills": "Éducation et compétences",
    "Health & Safety": "Santé et sécurité",
    "Environment": "Environnement",
    "Environmental Initiatives": "Initiatives environnementales",
    "Environmental Stewardship": "Gérance environnementale",
    "Corporate Responsibility": "Responsabilité de l'entreprise",
    "CSR & Community": "RSE et communauté",
    "How We Give Back": "Comment nous redonnons",
    "Food Security": "Sécurité alimentaire",
    "Community Infrastructure": "Infrastructures communautaires",
    "Clean Cooking Transition": "Transition vers une cuisson propre",
    "Clean Energy for Every Kitchen": "Une énergie propre pour chaque cuisine",
    "Active corporate social responsibility across all markets, building brand equity, local goodwill and sustainable business relationships.":
        "Une responsabilité sociale active sur tous les marchés, renforçant la notoriété de la marque, la bonne volonté locale et des relations d'affaires durables.",
    "As a major energy and logistics company operating across 8 countries, Lake Group recognises its responsibility to operate in a manner that minimises environmental impact and contributes to sustainable development across Africa.":
        "En tant que grande entreprise d'énergie et de logistique présente dans 8 pays, Lake Group reconnaît sa responsabilité d'agir de manière à minimiser son impact environnemental et à contribuer au développement durable en Afrique.",
    "As one of East Africa's largest private employers, Lake Group takes its social and environmental responsibilities seriously. The Group regularly provides support to community development through many of its CSR activities and is one of the leaders among its peers.":
        "En tant que l'un des plus grands employeurs privés d'Afrique de l'Est, Lake Group prend au sérieux ses responsabilités sociales et environnementales. Le Groupe soutient régulièrement le développement communautaire à travers de nombreuses activités de RSE et figure parmi les leaders de son secteur.",
    "Contributing to the construction and renovation of community facilities, roads, water points, health clinics and public amenities in operational areas.":
        "Contribuer à la construction et à la rénovation d'infrastructures communautaires, de routes, de points d'eau, de cliniques de santé et d'équipements publics dans les zones d'exploitation.",
    "Industry-leading safety standards across all divisions. Zero-harm ambition for employees, contractors and the communities we operate in.":
        "Des normes de sécurité de pointe dans toutes les divisions. Une ambition de zéro accident pour les employés, les sous-traitants et les communautés où nous opérons.",
    "Industry-leading safety standards in all operations": "Des normes de sécurité de pointe dans toutes les opérations",
    "Lake Group is committed to giving back to the communities it serves and operating with minimal environmental impact.":
        "Lake Group s'engage à redonner aux communautés qu'il sert et à opérer avec un impact environnemental minimal.",
    "Lake Group's commitment to environmental responsibility, clean energy transition and reducing our operational footprint.":
        "L'engagement de Lake Group envers la responsabilité environnementale, la transition vers une énergie propre et la réduction de notre empreinte opérationnelle.",
    "Investor Enquiries": "Demandes des investisseurs",
    "For Investors": "Pour les investisseurs",
    "Financial highlights, company growth profile and governance information for current and prospective investors.":
        "Faits saillants financiers, profil de croissance de l'entreprise et informations de gouvernance pour les investisseurs actuels et potentiels.",
    "Contact our corporate team for further information on the Group's financial profile and partnership opportunities.":
        "Contactez notre équipe d'entreprise pour plus d'informations sur le profil financier du Groupe et les opportunités de partenariat.",
    "Interested in Investing or Partnering with Lake Group?": "Intéressé à investir ou à devenir partenaire de Lake Group ?",
    "Diversified Revenue": "Revenus diversifiés",
    "Customer Satisfaction": "Satisfaction client",
    "Fleet Efficiency": "Efficacité de la flotte",
    "Fleet Statistics": "Statistiques de la flotte",
    "Fleet Categories": "Catégories de flotte",
    "Impact Numbers": "Chiffres d'impact",
    "Growth Pillars": "Piliers de croissance",
    "Guided by Experience. Driven by Vision.": "Guidés par l'expérience. Animés par la vision.",
    "Each subsidiary is led by sector specialists in oil & gas, logistics, engineering, manufacturing and port services.":
        "Chaque filiale est dirigée par des spécialistes sectoriels dans le pétrole et le gaz, la logistique, l'ingénierie, la fabrication et les services portuaires.",
    "Eight Sectors": "Huit secteurs",
    "Eight Sectors. One Vision.": "Huit secteurs. Une seule vision.",
    "Eight distinct business lines across energy, logistics, manufacturing and construction reduce single-sector risk and provide stable multi-stream revenue.":
        "Huit secteurs d'activité distincts dans l'énergie, la logistique, la fabrication et la construction réduisent le risque sectoriel unique et assurent des revenus stables et diversifiés.",
    "From fuel stations to steel mills, eight sectors, one vision, across eight countries.":
        "Des stations-service aux aciéries : huit secteurs, une seule vision, dans huit pays.",
    "Fuel depots, LPG terminals, truck fleets, container depots and concrete plants, all connected through our Africa network.":
        "Dépôts de carburant, terminaux GPL, flottes de camions, dépôts de conteneurs et centrales à béton, tous connectés via notre réseau africain.",
    "Energy for Africa. Responsibly.": "De l'énergie pour l'Afrique. En toute responsabilité.",
    "Delivering East Africa's Development": "Au service du développement de l'Afrique de l'Est",
    "Engineered for Performance": "Conçu pour la performance",
    "First in Tanzania. Built to Last.": "Premier en Tanzanie. Conçu pour durer.",
    "Fastest Growing Company in Africa": "Entreprise à la croissance la plus rapide d'Afrique",
    "Highest Service Standards": "Normes de service les plus élevées",
    "Highest service standards and consistent supply of fuel and customer care in every territory.":
        "Les normes de service les plus élevées et un approvisionnement constant en carburant et un service client dans chaque territoire.",
    "Guided by our core values: <strong style=\"color:var(--yellow)\">Teamwork, Reliability, Integrity</strong> and <strong style=\"color:var(--yellow)\">Customer Satisfaction</strong>.":
        "Guidés par nos valeurs fondamentales : <strong style=\"color:var(--yellow)\">esprit d'équipe, fiabilité, intégrité</strong> et <strong style=\"color:var(--yellow)\">satisfaction client</strong>.",
    "Committed to excellence": "Engagés envers l'excellence",
    "Field Operations": "Opérations sur le terrain",
    "Field Operations across East Africa": "Opérations sur le terrain en Afrique de l'Est",
    "Country Operations": "Opérations par pays",
    "African Countries": "Pays africains",
    "And expanding": "Et en expansion",
    "Available in 5 Countries": "Disponible dans 5 pays",
    "Countries with clean LPG access via Lake Gas": "Pays ayant accès au GPL propre via Lake Gas",
    "Find your nearest Lake Oil station by city or region.": "Trouvez votre station Lake Oil la plus proche par ville ou région.",
    "Find a Fuel Station": "Trouver une station-service",
    "City, Region, Country": "Ville, région, pays",
    "Convenience Store": "Magasin de proximité",
    "Border Crossing": "Passage frontalier",
    "By Tracking ID": "Par numéro de suivi",
    "By Truck Number": "Par numéro de camion",
    "Enter your tracking ID or truck number to view real-time delivery status and estimated arrival.":
        "Entrez votre numéro de suivi ou de camion pour voir le statut de livraison en temps réel et l'heure d'arrivée estimée.",
    "Est. Arrival": "Arrivée estimée",
    "Delivery Progress": "Progression de la livraison",
    "Delivery Location": "Lieu de livraison",
    "Destination": "Destination",
    "For urgent shipment queries, contact our logistics team directly.": "Pour toute question urgente concernant une expédition, contactez directement notre équipe logistique.",
    "Have a major project that needs energy, logistics or construction supply support?":
        "Vous avez un projet majeur nécessitant un soutien en énergie, logistique ou approvisionnement en construction ?",
    "Discuss Your Project": "Discutez de votre projet",
    "From multi-million dollar construction projects to long-haul logistics contracts, Lake Group has the scale, expertise and equipment to deliver.":
        "Des projets de construction de plusieurs millions de dollars aux contrats logistiques longue distance, Lake Group dispose de l'envergure, de l'expertise et des équipements nécessaires.",
    "Completed": "Terminé",
    "Completed (YTD)": "Terminé (cumul annuel)",
    "Infrastructure": "Infrastructure",
    "Infrastructure Layers": "Couches d'infrastructure",
    "Infrastructure Ownership": "Propriété de l'infrastructure",
    "Business": "Affaires",
    "For press releases, interviews or media partnerships:": "Pour les communiqués de presse, interviews ou partenariats médias :",
    "For interview requests, press enquiries or media partnerships, please contact our communications team.":
        "Pour les demandes d'interview, les questions de presse ou les partenariats médias, contactez notre équipe de communication.",
    "Email Media Team": "Contacter l'équipe média",
    "Documents": "Documents",
    "Download": "Télécharger",
    "Download PDF": "Télécharger le PDF",
    "Article": "Article",
    "Get in Touch": "Contactez-nous",
    "Contact Us": "Contactez-nous",
    "Contact Lake Group": "Contacter Lake Group",
    "Contact GCCP": "Contacter GCCP",
    "Contact Sales": "Contacter les ventes",
    "Contact Steel Sales": "Contacter les ventes acier",
    "Contact Information": "Coordonnées",
    "How can we help?": "Comment pouvons-nous vous aider ?",
    "Enquiry Form": "Formulaire de demande",
    "Cover Message": "Message de présentation",
    "Full Name *": "Nom complet *",
    "Email *": "E-mail *",
    "Email Address": "Adresse e-mail",
    "Email Address *": "Adresse e-mail *",
    "Company / Organisation": "Entreprise / Organisation",
    "Company name": "Nom de l'entreprise",
    "Describe your requirements, timeline, and any special specifications...":
        "Décrivez vos besoins, vos délais et toute spécification particulière...",
    "I consent to Lake Group processing my enquiry data and contacting me with a response.":
        "J'accepte que Lake Group traite mes données de demande et me contacte avec une réponse.",
    "Immediate acknowledgement by email": "Accusé de réception immédiat par e-mail",
    "Fast-track setup for new corporate clients": "Mise en place accélérée pour les nouveaux clients corporatifs",
    "Custom quote delivered": "Devis personnalisé livré",
    "Finalise & onboard": "Finalisation et intégration",
    "Estimated Volume / Quantity": "Volume / quantité estimé",
    "Project Details & Requirements *": "Détails et exigences du projet *",
    "Fuel & Petroleum Supply": "Approvisionnement en carburant et pétrole",
    "Request a Quote": "Demander un devis",
    "Corporate clients only. Contact us for access.": "Clients corporatifs uniquement. Contactez-nous pour y accéder.",
    "Client Dashboard": "Tableau de bord client",
    "Corporate Portal": "Portail corporatif",
    "Corporate Client": "Client corporatif",
    "Account Details": "Détails du compte",
    "Active Orders": "Commandes actives",
    "Here's your account summary for December 2024": "Voici le résumé de votre compte pour décembre 2024",
    "Documents": "Documents",
    "Last update:": "Dernière mise à jour :",
    "Thank you for your message. Email admin@lakeoilgroup.com or call +255 222780510. Mon\u2013Fri 9:00\u201318:00.":
        "Merci pour votre message. Envoyez un e-mail à admin@lakeoilgroup.com ou appelez le +255 222780510. Lun-Ven 9h00-18h00.",
    "Lake Oil supplies petroleum products across Tanzania, Kenya, Zambia, DRC, Rwanda, Burundi & Ethiopia. Contact admin@lakeoilgroup.com for pricing.":
        "Lake Oil fournit des produits pétroliers en Tanzanie, au Kenya, en Zambie, en RDC, au Rwanda, au Burundi et en Éthiopie. Contactez admin@lakeoilgroup.com pour les tarifs.",
    "Lake Gas offers 6kg, 10kg, 15kg and 38kg cylinders for domestic and commercial use. Available in 7 countries across East & Central Africa.":
        "Lake Gas propose des bouteilles de 6 kg, 10 kg, 15 kg et 38 kg pour usage domestique et commercial. Disponible dans 7 pays d'Afrique de l'Est et centrale.",
    "Lake Trans operates a fleet of 700+ trucks across East & Central Africa for bulk liquid haulage and general cargo.":
        "Lake Trans exploite une flotte de plus de 700 camions en Afrique de l'Est et centrale pour le transport de liquides en vrac et de marchandises générales.",
    "Our headquarters: Plot 49, Mikocheni Light Industrial Area, Dar es Salaam. Tel: +255 222780510 | Email: admin@lakeoilgroup.com":
        "Notre siège : Plot 49, Mikocheni Light Industrial Area, Dar es Salaam. Tél : +255 222780510 | E-mail : admin@lakeoilgroup.com",
    "Visit our Station Locator page to find the nearest Lake Oil fuel station. We have 85+ stations across Tanzania and the region.":
        "Consultez notre page Localisateur de stations pour trouver la station Lake Oil la plus proche. Nous avons plus de 85 stations en Tanzanie et dans la région.",
    "We're always looking for talented people. Visit our Careers page to explore opportunities across our 20+ subsidiaries.":
        "Nous recherchons toujours des talents. Consultez notre page Carrières pour découvrir les opportunités dans nos plus de 20 filiales.",
    "Lake Steel is the first company in Tanzania to introduce High Strength Corrosion Resistant (HS-CR) rebars with 100,000 MT annual capacity.":
        "Lake Steel est la première entreprise en Tanzanie à introduire des barres d'armature à haute résistance et résistantes à la corrosion (HS-CR), avec une capacité annuelle de 100 000 tonnes.",
    "GCCP (Gulf Concrete & Cement Products) is Dar es Salaam's leading ready-mix concrete supplier, established 2010.":
        "GCCP (Gulf Concrete & Cement Products) est le principal fournisseur de béton prêt à l'emploi de Dar es Salaam, créé en 2010.",
    "Hello! Welcome to Lake Group. How can I help you today?":
        "Bonjour ! Bienvenue chez Lake Group. Comment puis-je vous aider aujourd'hui ?",
    "Hi there! I'm the Lake Group assistant. Ask me about our services, locations, or how to get in touch.":
        "Bonjour ! Je suis l'assistant Lake Group. Posez-moi des questions sur nos services, nos sites ou comment nous contacter.",
    # --- Container, fleet, concrete spec checkmarks ---
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>2 boom pumps (32m boom length)":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>2 pompes à flèche (flèche de 32 m)",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>2x Aggregate crushing plants (250T/hr each)":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>2 installations de concassage de granulats (250 t/h chacune)",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>2x Sany International fully-automatic batching plants":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>2 centrales à béton entièrement automatiques Sany International",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>4 stationary concrete pumps (Sany International)":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>4 pompes à béton stationnaires (Sany International)",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>Container repair and maintenance":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>Réparation et entretien de conteneurs",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>Container storage and stacking":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>Stockage et empilage de conteneurs",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>Container stuffing and de-stuffing (LCL/FCL)":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>Empotage et dépotage de conteneurs (LCL/FCL)",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>Customs examination and clearance support":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>Soutien à l'inspection douanière et au dédouanement",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>Integration with Lake Trans trucking network":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>Intégration avec le réseau de camionnage Lake Trans",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>Own quarry at Lugoba, Tanzania":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>Carrière propre à Lugoba, Tanzanie",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>Reefer (refrigerated) container handling":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>Manutention de conteneurs frigorifiques",
    "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Bulk petroleum and liquid haulage":
        "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Transport de pétrole et de liquides en vrac",
    "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Cross-border regional transport":
        "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Transport régional transfrontalier",
    "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Dry cargo and containerised freight":
        "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Fret sec et marchandises conteneurisées",
    "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Experienced drivers and route managers":
        "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Chauffeurs expérimentés et gestionnaires d'itinéraires",
    "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Real-time fleet tracking capability":
        "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Suivi de flotte en temps réel",
    # --- Stats / numbers with units ---
    "+ Cross-border corridors": "+ Corridors transfrontaliers",
    "1 subsidiary (MERM)": "1 filiale (MERM)",
    "10 Kg Composite Cylinder <span class=\"badge badge-amber\" style=\"margin-left:8px\">New</span>":
        "Bouteille composite de 10 kg <span class=\"badge badge-amber\" style=\"margin-left:8px\">Nouveau</span>",
    "100,000 metric tonnes": "100 000 tonnes métriques",
    "12m³ capacity": "Capacité de 12 m³",
    "15 Kg Cylinder": "Bouteille de 15 kg",
    "20ft & 40ft": "20 et 40 pieds",
    "21 Nationalities. One Team.": "21 nationalités. Une seule équipe.",
    "25 tonnes per hour": "25 tonnes par heure",
    "30–60k litres": "30 000 à 60 000 litres",
    "38 Kg Cylinder": "Bouteille de 38 kg",
    "39 real photos": "39 photos réelles",
    "4,000+ Employees Milestone": "Cap des 4 000 employés franchi",
    "4,600+ Employees. 8 Countries. Still Growing.": "Plus de 4 600 employés. 8 pays. Toujours en croissance.",
    "6 Kg Cylinder": "Bouteille de 6 kg",
    "8 Countries, 4,600+ Employees": "8 pays, plus de 4 600 employés",
    "85+ Stations Across Tanzania": "Plus de 85 stations en Tanzanie",
    "<strong>39 real photos</strong> from Lake Group operations, GCCP, MERM Dubai, Lake Gas, Lake Oil & more.":
        "<strong>39 photos réelles</strong> des opérations de Lake Group, GCCP, MERM Dubaï, Lake Gas, Lake Oil et plus encore.",
    "<strong>Account #:</strong> LG-CORP-4821": "<strong>N° de compte :</strong> LG-CORP-4821",
    "<strong>Account Manager:</strong> Dar es Salaam Office": "<strong>Gestionnaire de compte :</strong> Bureau de Dar es Salaam",
    "<strong>Company:</strong> Demo Corporation Ltd.": "<strong>Entreprise :</strong> Demo Corporation Ltd.",
    "<strong>Credit Limit:</strong> USD 250,000": "<strong>Limite de crédit :</strong> 250 000 USD",
    "<strong>Last update:</strong> Truck T-4821 checked into Tunduma border crossing at 09:45. On schedule for delivery.":
        "<strong>Dernière mise à jour :</strong> Le camion T-4821 a passé le poste frontière de Tunduma à 09h45. Livraison dans les délais.",
    "@lakeoilltd on Instagram": "@lakeoilltd sur Instagram",
    "A showcase of landmark construction, infrastructure and supply projects delivered by Lake Group across East Africa.":
        "Une vitrine des projets de construction, d'infrastructure et d'approvisionnement majeurs réalisés par Lake Group en Afrique de l'Est.",
    "A story of bold decisions, relentless expansion, and building an energy empire from the ground up.":
        "Une histoire de décisions audacieuses, d'expansion incessante et de construction d'un empire énergétique à partir de rien.",
    "ACFS: Container Freight Station": "ACFS : Gare de fret pour conteneurs",
    "AFICD": "AFICD",
    "AFICD & ACFS": "AFICD et ACFS",
    "AFICD (African Inland Container Depot) and ACFS (African Container Freight Station) are Lake Group's port logistics arms, providing critical container storage, handling and customs services that extend port capacity into the hinterland.":
        "AFICD (African Inland Container Depot) et ACFS (African Container Freight Station) sont les bras logistiques portuaires de Lake Group, fournissant des services essentiels de stockage, de manutention et de dédouanement de conteneurs qui étendent la capacité portuaire vers l'arrière-pays.",
    "AFICD (African Inland Container Depot) is launched in Tanzania and Zambia. MERM (Middle East Ready Mix LLC) is established in Dubai, marking the Group's first presence outside Africa.":
        "AFICD (African Inland Container Depot) est lancé en Tanzanie et en Zambie. MERM (Middle East Ready Mix LLC) est créé à Dubaï, marquant la première présence du Groupe hors d'Afrique.",
    "AFICD + ACFS": "AFICD + ACFS",
    "AFICD operates strategic inland container depots in Tanzania, Zambia and Mozambique, extending port capacity into the hinterland and enabling efficient cross-border trade.":
        "AFICD exploite des dépôts de conteneurs intérieurs stratégiques en Tanzanie, en Zambie et au Mozambique, étendant la capacité portuaire vers l'arrière-pays et facilitant le commerce transfrontalier.",
    "AFICD: African Inland Container Depot": "AFICD : Dépôt intérieur de conteneurs africain",
    "Abdulrahman Mohamed": "Abdulrahman Mohamed",
    "Account Manager:": "Gestionnaire de compte :",
    "Africa Operations Network": "Réseau d'opérations en Afrique",
    "African Inland Container Depot (AFICD)": "Dépôt intérieur de conteneurs africain (AFICD)",
    "African Inland Container Depot (AFICD) and Container Freight Station (ACFS), port extension solutions across East Africa.":
        "Dépôt intérieur de conteneurs africain (AFICD) et gare de fret pour conteneurs (ACFS), solutions d'extension portuaire en Afrique de l'Est.",
    "African Inland Container Depot Network": "Réseau de dépôts intérieurs de conteneurs africains",
    "After-Sales Services": "Services après-vente",
    "Aggregate Plant Cap.": "Capacité de l'installation de granulats",
    "Agricultural and greenfield project development. Projects Manager: Nassoro Abubakari":
        "Développement de projets agricoles et de terrains vierges. Chef de projets : Nassoro Abubakari",
    "All petroleum transport operations are governed by strict zero-tolerance spillage protocols. Our tanker fleet is regularly inspected and certified.":
        "Toutes les opérations de transport de pétrole sont régies par des protocoles stricts de tolérance zéro envers les déversements. Notre flotte de camions-citernes est régulièrement inspectée et certifiée.",
    "Ally Edha Awadh": "Ally Edha Awadh",
    "Ally Edha Awadh founds Lake Oil Ltd. at age 27 in Dar es Salaam, Tanzania, the seed of what would become Lake Group. Begins petroleum distribution with a small fleet.":
        "Ally Edha Awadh fonde Lake Oil Ltd. à 27 ans à Dar es Salaam, en Tanzanie, la graine de ce qui deviendrait Lake Group. Débute la distribution de pétrole avec une petite flotte.",
    "Architectural Concrete": "Béton architectural",
    "Arusha Town Centre, Arusha": "Centre-ville d'Arusha, Arusha",
    "Automotive Lubricants": "Lubrifiants automobiles",
    "Billets heated to rolling temperature in our furnace.": "Billettes chauffées à la température de laminage dans notre four.",
    "Billets tested in our lab. Only approved materials proceed.": "Billettes testées dans notre laboratoire. Seuls les matériaux approuvés sont retenus.",
    "Brackish groundwater": "Eaux souterraines saumâtres",
    "Burundi Petroleum Ltd.": "Burundi Petroleum Ltd.",
    "Composite LPG Cylinders Launched": "Lancement des bouteilles de GPL composites",
    "Computerised rolling at 25T/hr capacity.": "Laminage informatisé d'une capacité de 25 t/h.",
    "Concrete Mixer Trucks": "Camions-toupies",
    "Concrete, 600m³": "Béton, 600 m³",
    "Container & Depot Services": "Services de conteneurs et de dépôt",
    "Container Depot & Dubai Expansion": "Dépôt de conteneurs et expansion à Dubaï",
    "Container Depot Services": "Services de dépôt de conteneurs",
    "Container Handlers": "Chariots à conteneurs",
    "Contract Renewal, Pending Signature": "Renouvellement de contrat, en attente de signature",
    "Country borders shown in white · Lake Group nations in gold · Colored dots = infrastructure":
        "Frontières des pays en blanc · Pays Lake Group en or · Points colorés = infrastructure",
    "Crack-Resistant Concrete": "Béton résistant à la fissuration",
    # --- Batch 2: history, LPG, MERM, steel, careers, contact, tracking ---
    "\"With a team of experienced engineers and business professionals across our units, Lake Group is fully geared to meet the demands of the global marketplace, from fuel marketing and haulage to LPG, steel, lubricants and concrete.\"":
        "« Avec une équipe d'ingénieurs expérimentés et de professionnels dans toutes nos unités, Lake Group est pleinement équipé pour répondre aux exigences du marché mondial, de la commercialisation de carburant et du transport au GPL, à l'acier, aux lubrifiants et au béton. »",
    "(indicative, <span id=\"currency-label\">USD</span>)": "(indicatif, <span id=\"currency-label\">USD</span>)",
    "DRC & Ethiopia Entry": "Entrée en RDC et en Éthiopie",
    "DRC Petroleum Ltd.": "DRC Petroleum Ltd.",
    "DRC Petroleum Ltd. and Wadi Elsundus Petroleum Co. (Ethiopia) are established, bringing the Group's operational footprint to 7 countries.":
        "DRC Petroleum Ltd. et Wadi Elsundus Petroleum Co. (Éthiopie) sont créées, portant l'empreinte opérationnelle du Groupe à 7 pays.",
    "Dar es Salaam": "Dar es Salaam",
    "Dar es Salaam, gateway to East Africa's largest economy": "Dar es Salaam, porte d'entrée de la plus grande économie d'Afrique de l'Est",
    "Dedicated LPG transport vehicles for safe cylinder and bulk gas delivery across East Africa.":
        "Véhicules de transport GPL dédiés pour la livraison sécurisée de bouteilles et de gaz en vrac en Afrique de l'Est.",
    "Delivery Note, LG-2024-8847": "Bon de livraison, LG-2024-8847",
    "Dodoma City Centre, Dodoma": "Centre-ville de Dodoma, Dodoma",
    "Due: Jan 5, 2025": "Échéance : 5 janvier 2025",
    "East Africa Construction Expo": "Salon de la construction d'Afrique de l'Est",
    "Engine oils, transmission fluids and greases for passenger and commercial vehicles.":
        "Huiles moteur, fluides de transmission et graisses pour véhicules particuliers et utilitaires.",
    "Est. group revenue:": "Chiffre d'affaires estimé du groupe :",
    "Facebook": "Facebook",
    "Fire Resistance": "Résistance au feu",
    "Flagship petroleum importer, depot operator and retail network, Tanzania's top fuel distributors. MD: Abdulrahman Mohamed":
        "Importateur de pétrole phare, exploitant de dépôts et réseau de vente au détail, parmi les principaux distributeurs de carburant de Tanzanie. DG : Abdulrahman Mohamed",
    "Flows and consolidates under its own weight, ideal for congested reinforcement.":
        "S'écoule et se consolide sous son propre poids, idéal pour les armatures denses.",
    "For projects requiring fast formwork removal and accelerated construction schedules.":
        "Pour les projets nécessitant un décoffrage rapide et des délais de construction accélérés.",
    "Founded and led by Ally Edha Awadh: an experienced entrepreneur who has built a high-credit-rated organisation over nearly two decades.":
        "Fondé et dirigé par Ally Edha Awadh : un entrepreneur expérimenté qui a bâti une organisation hautement solvable depuis près de deux décennies.",
    "Founder of Lake Group (2006) · Forbes-recognised entrepreneur · Young Business Leader of the Year, African Leadership Magazine 2022":
        "Fondateur de Lake Group (2006) · Entrepreneur reconnu par Forbes · Jeune dirigeant d'entreprise de l'année, African Leadership Magazine 2022",
    "From Billets to Bars": "Des billettes aux barres",
    "From petroleum tankers to dry cargo, our transport division ensures timely, safe and cost-effective delivery to destinations across Tanzania, Kenya and Zambia, and throughout the wider region.":
        "Des camions-citernes au fret sec, notre division transport assure une livraison rapide, sûre et économique vers des destinations en Tanzanie, au Kenya et en Zambie, et dans toute la région.",
    "Fuel & Logistics": "Carburant et logistique",
    "Fuel & Oil (5)": "Carburant et pétrole (5)",
    "Fuel Distribution Network": "Réseau de distribution de carburant",
    "GCCP Co. Ltd.": "GCCP Co. Ltd.",
    "GCCP Co. Ltd.: Ready-Mix Concrete": "GCCP Co. Ltd. : Béton prêt à l'emploi",
    "GCCP Concrete (12)": "Béton GCCP (12)",
    "GCCP Ready-Mix Concrete": "Béton prêt à l'emploi GCCP",
    "GCCP operates its own quarry at Lugoba with two aggregate plants of 250 tons/hour capacity each, producing 30,000 m³ of aggregate monthly. Its ready-mix operations are powered by Sany International batching plants from China.":
        "GCCP exploite sa propre carrière à Lugoba avec deux installations de granulats d'une capacité de 250 tonnes/heure chacune, produisant 30 000 m³ de granulats par mois. Ses opérations de béton prêt à l'emploi sont assurées par des centrales Sany International en provenance de Chine.",
    "GCCP supplied specialist high-performance ready-mix concrete to support civil works on Tanzania's flagship 2,115 MW Julius Nyerere Hydropower Project at Stiegler's Gorge.":
        "GCCP a fourni du béton prêt à l'emploi haute performance pour soutenir les travaux de génie civil du projet hydroélectrique phare de Tanzanie, Julius Nyerere (2 115 MW), aux gorges de Stiegler.",
    "GCCP's quarry operations at Lugoba include progressive land rehabilitation, restoring extracted areas to usable agricultural and ecological land.":
        "Les opérations de carrière de GCCP à Lugoba comprennent une réhabilitation progressive des terres, restaurant les zones extraites en terres agricoles et écologiques utilisables.",
    "GCCP, Concrete Boom Pump (32m) at Construction Site": "GCCP, pompe à béton à flèche (32 m) sur un chantier",
    "GCCP, Foundation & Piling Concrete Operations": "GCCP, opérations de béton pour fondations et pieux",
    "GCCP, Gulf Concrete Batching Plant, Dar es Salaam": "GCCP, centrale à béton Gulf, Dar es Salaam",
    "GCCP, Heavy Equipment & Sany Batching Systems": "GCCP, équipements lourds et systèmes de dosage Sany",
    "GCCP, Lugoba Quarry Aggregate Production": "GCCP, production de granulats à la carrière de Lugoba",
    "GCCP, Mixer Truck Fleet (20 units, 12m³ each)": "GCCP, flotte de camions-toupies (20 unités, 12 m³ chacune)",
    "GCCP, Plant Overview, Vijibweni Area": "GCCP, vue d'ensemble de l'usine, zone de Vijibweni",
    "GCCP, Quality Assurance & Testing Laboratory": "GCCP, laboratoire d'assurance qualité et d'essais",
    "GCCP, Ready-Mix Concrete Delivery Operations": "GCCP, opérations de livraison de béton prêt à l'emploi",
    "GCCP, Ready-Mix Supply to Prestige Projects": "GCCP, approvisionnement en béton pour projets prestigieux",
    "GCCP, Sany International Aggregate Plant (250T/hr)": "GCCP, installation de granulats Sany International (250 t/h)",
    "GCCP, Truck Mixer Loading at Batching Plant": "GCCP, chargement de camion-toupie à la centrale",
    "Gulf Aggregate: Stone Crushing": "Gulf Aggregate : concassage de pierre",
    "Gulf Cement & Concrete Products (GCCP)": "Gulf Cement & Concrete Products (GCCP)",
    "Gulf Concrete and Cement Products Company (GCCP) is established, quickly becoming the market leader in ready-mix concrete supply in Dar es Salaam.":
        "Gulf Concrete and Cement Products Company (GCCP) est créée, devenant rapidement le leader du marché du béton prêt à l'emploi à Dar es Salaam.",
    "Gulf Concrete and Cement Products Company Ltd (GCCP), established in 2010, is one of the leading suppliers of ready-mix concrete in Dar es Salaam, involved in many of the city's most prestigious construction projects.":
        "Gulf Concrete and Cement Products Company Ltd (GCCP), créée en 2010, est l'un des principaux fournisseurs de béton prêt à l'emploi à Dar es Salaam, impliquée dans nombre des projets de construction les plus prestigieux de la ville.",
    "Gulf Concrete and Cement Products, Dar es Salaam's market-leading ready-mix concrete supplier since 2010.":
        "Gulf Concrete and Cement Products, fournisseur leader du marché du béton prêt à l'emploi à Dar es Salaam depuis 2010.",
    "Hazmat Certified": "Certifié matières dangereuses",
    "Headquarters · 10 subsidiaries": "Siège social · 10 filiales",
    "Heads people strategy and workforce development for Lake Oil, supporting the Group's diverse team of 4,600+ professionals across East and Central Africa.":
        "Dirige la stratégie RH et le développement des effectifs pour Lake Oil, soutenant l'équipe diversifiée de plus de 4 600 professionnels du Groupe en Afrique de l'Est et centrale.",
    "Heavy-duty flatbed and cargo trucks for construction materials, steel, containers and general freight.":
        "Camions plateaux et cargo robustes pour matériaux de construction, acier, conteneurs et fret général.",
    "Heavy-duty industrial oils for machinery, compressors and manufacturing equipment.":
        "Huiles industrielles robustes pour machines, compresseurs et équipements de fabrication.",
    "Heavy-duty tankers for bulk liquid petroleum transport. Capacity from 30,000 to 60,000 litres. Full hazmat certification and GPS tracking.":
        "Camions-citernes robustes pour le transport de pétrole liquide en vrac. Capacité de 30 000 à 60 000 litres. Certification complète matières dangereuses et suivi GPS.",
    "High rainfall / humidity": "Fortes pluies / humidité",
    "High-finish concrete for facades, decorative surfaces and exposed structural elements.":
        "Béton à finition soignée pour façades, surfaces décoratives et éléments structurels apparents.",
    "High-quality automotive, industrial and marine lubricants manufactured and distributed across East and Central Africa.":
        "Lubrifiants automobiles, industriels et marins de haute qualité fabriqués et distribués en Afrique de l'Est et centrale.",
    "High-strength, highly durable concrete for piling, deep foundations and critical structures.":
        "Béton haute résistance et très durable pour pieux, fondations profondes et structures critiques.",
    "ICD, CFS and empty container depot services with rail-linked logistics in Tanzania.":
        "Services de dépôt ICD, CFS et de conteneurs vides avec logistique ferroviaire en Tanzanie.",
    "ISO-aligned environmental practices": "Pratiques environnementales conformes aux normes ISO",
    "Ideal Applications": "Applications idéales",
    "In Dubai, Lake Group operates <strong>MERM (Middle East Ready Mix LLC)</strong>, one of the largest premix plants in the region.":
        "À Dubaï, Lake Group exploite <strong>MERM (Middle East Ready Mix LLC)</strong>, l'une des plus grandes centrales à béton de la région.",
    "Industrial Lubricants": "Lubrifiants industriels",
    "Industrial pollution zones": "Zones de pollution industrielle",
    "Inland depot serving the Zambia-Tanzania corridor": "Dépôt intérieur desservant le corridor Zambie-Tanzanie",
    "Interactive Experience": "Expérience interactive",
    "Interactive map of Lake Group's presence across 8 countries in East and Central Africa, plus Dubai.":
        "Carte interactive de la présence de Lake Group dans 8 pays d'Afrique de l'Est et centrale, ainsi qu'à Dubaï.",
    "Invoice, Dec 2024": "Facture, déc. 2024",
    "Join our team or partner with us across Africa.": "Rejoignez notre équipe ou devenez partenaire à travers l'Afrique.",
    "Julius Nyerere Hydropower – Concrete Supply": "Hydroélectrique Julius Nyerere – Approvisionnement en béton",
    "Juma Nuru": "Juma Nuru",
    "KES (Kenyan Shilling)": "KES (Shilling kényan)",
    "Kariakoo, Dar es Salaam": "Kariakoo, Dar es Salaam",
    "Khalid Mohamed": "Khalid Mohamed",
    "LAKE OIL": "LAKE OIL",
    "LG-2024-8778": "LG-2024-8778", "LG-2024-8802": "LG-2024-8802",
    "LG-2024-8831": "LG-2024-8831", "LG-2024-8847": "LG-2024-8847",
    "LPG Bulk, 8MT": "GPL en vrac, 8 t",
    "LPG Composite Cylinder Launch": "Lancement de la bouteille GPL composite",
    "LPG Cylinder Exchange": "Échange de bouteilles GPL",
    "LPG Gas (5)": "Gaz GPL (5)",
    "LPG Gas (Bulk / Cylinder)": "Gaz GPL (vrac / bouteille)",
    "LPG Gas Distribution": "Distribution de gaz GPL",
    "LPG bottling, composite cylinders and East Africa's largest LPG storage terminal in Tanga.":
        "Embouteillage de GPL, bouteilles composites et le plus grand terminal de stockage de GPL d'Afrique de l'Est, à Tanga.",
    "LPG, a core business of Lake Gas, plays a critical role in East Africa's clean cooking agenda, reducing dependence on charcoal and firewood, improving indoor air quality and reducing deforestation.":
        "Le GPL, activité principale de Lake Gas, joue un rôle essentiel dans l'agenda de cuisson propre en Afrique de l'Est, réduisant la dépendance au charbon de bois et au bois de chauffage, améliorant la qualité de l'air intérieur et réduisant la déforestation.",
    "LT-2024-00847": "LT-2024-00847",
    "Lake Agro Ltd": "Lake Agro Ltd",
    "Lake Gas Across Africa": "Lake Gas à travers l'Afrique",
    "Lake Gas Ltd": "Lake Gas Ltd", "Lake Gas Ltd.": "Lake Gas Ltd.",
    "Lake Gas Ltd. is East Africa's trusted LPG bottling and distribution company, operating across 7 countries. From domestic cooking to large-scale commercial kitchens and industrial applications, Lake Gas provides safe and reliable liquefied petroleum gas.":
        "Lake Gas Ltd. est l'entreprise de confiance d'embouteillage et de distribution de GPL en Afrique de l'Est, présente dans 7 pays. De la cuisine domestique aux grandes cuisines commerciales et aux applications industrielles, Lake Gas fournit du gaz de pétrole liquéfié sûr et fiable.",
    "Lake Gas Ltd.: LPG Bottling & Distribution": "Lake Gas Ltd. : Embouteillage et distribution de GPL",
    "Lake Gas Ltd.: LPG Distribution": "Lake Gas Ltd. : Distribution de GPL",
    "Lake Gas Ltd.: LPG Distribution across East Africa": "Lake Gas Ltd. : Distribution de GPL en Afrique de l'Est",
    "Lake Gas launches innovative composite cylinders in Dar es Salaam, non-explosive, non-corrosive, lightweight and translucent, a revolution for East Africa's cooking fuel market.":
        "Lake Gas lance des bouteilles composites innovantes à Dar es Salaam, non explosives, non corrosives, légères et translucides, une révolution pour le marché du combustible de cuisson en Afrique de l'Est.",
    "Lake Gas pioneered the introduction of composite LPG cylinders in East Africa, non-explosive, lightweight and translucent, revolutionising domestic cooking gas safety.":
        "Lake Gas a été pionnier dans l'introduction de bouteilles GPL composites en Afrique de l'Est, non explosives, légères et translucides, révolutionnant la sécurité du gaz de cuisson domestique.",
    "Lake Gas supplies LPG to 7 countries, displacing millions of charcoal cookstoves. Every cylinder sold reduces CO₂, indoor air pollution and deforestation pressure.":
        "Lake Gas fournit du GPL à 7 pays, remplaçant des millions de foyers à charbon de bois. Chaque bouteille vendue réduit le CO₂, la pollution de l'air intérieur et la pression de déforestation.",
    "Lake Gas, 10kg Composite Cylinder (Non-Explosive, Tran": "Lake Gas, bouteille composite de 10 kg (non explosive, tran",
    "Lake Gas, 15kg Cylinder for Hotels & Restaurants": "Lake Gas, bouteille de 15 kg pour hôtels et restaurants",
    "Lake Gas, 38kg Commercial LPG Cylinder": "Lake Gas, bouteille GPL commerciale de 38 kg",
    "Lake Gas, 6kg Domestic LPG Cylinder": "Lake Gas, bouteille GPL domestique de 6 kg",
    "Lake Gas, Composite Cylinder Product Range": "Lake Gas, gamme de bouteilles composites",
    "Lake Group Announces Expansion into Mozambique with New Fuel Depot and AFICD Operations":
        "Lake Group annonce son expansion au Mozambique avec un nouveau dépôt de carburant et des opérations AFICD",
    "Lake Group Gallery": "Galerie Lake Group",
    "Lake Group News": "Actualités Lake Group",
    "Lake Group Workforce Exceeds 4,600 Employees Across 8 Countries": "L'effectif de Lake Group dépasse 4 600 employés dans 8 pays",
    "Lake Group continues to expand, deepening its regional footprint, investing in new technologies, and driving economic development across East and Central Africa.":
        "Lake Group continue de se développer, renforçant son empreinte régionale, investissant dans de nouvelles technologies et stimulant le développement économique en Afrique de l'Est et centrale.",
    "Lake Group expands operations into Kenya, Zambia, Burundi and Rwanda, bringing fuel, LPG and lubricants to neighbouring markets.":
        "Lake Group étend ses opérations au Kenya, en Zambie, au Burundi et au Rwanda, apportant carburant, GPL et lubrifiants aux marchés voisins.",
    "Lake Group has demonstrated consistent and significant growth since its founding in 2006. From a single petroleum distributor in Dar es Salaam, it has grown into a diversified conglomerate operating across 8 countries with 20+ subsidiaries.":
        "Lake Group a démontré une croissance constante et significative depuis sa création en 2006. D'un seul distributeur de pétrole à Dar es Salaam, il est devenu un conglomérat diversifié présent dans 8 pays avec plus de 20 filiales.",
    "Lake Group has formally inaugurated its Mozambique operations, establishing Lake Oil LDA and an AFICD inland container depot to serve growing trade flows along the Beira corridor.":
        "Lake Group a officiellement inauguré ses opérations au Mozambique, établissant Lake Oil LDA et un dépôt intérieur de conteneurs AFICD pour servir les flux commerciaux croissants le long du corridor de Beira.",
    "Lake Group has reported continued workforce growth, now employing over 4,600 professionals across 20+ subsidiaries in 8 countries, representing 21 nationalities.":
        "Lake Group a annoncé une croissance continue de ses effectifs, employant désormais plus de 4 600 professionnels dans plus de 20 filiales et 8 pays, représentant 21 nationalités.",
    "Lake Group in Action <span class=\"g-count\">39 Photos</span>": "Lake Group en action <span class=\"g-count\">39 photos</span>",
    "Lake Group is geographically spread across every region of Tanzania and neighbouring countries of Zambia, DRC, Burundi, Rwanda and Kenya, with operations in Ethiopia, Mozambique and a major premix plant in Dubai.":
        "Lake Group est géographiquement présent dans toutes les régions de Tanzanie et des pays voisins (Zambie, RDC, Burundi, Rwanda et Kenya), avec des opérations en Éthiopie, au Mozambique et une importante centrale à béton à Dubaï.",
    "Lake Group offers careers with real impact, you'll work across one of East Africa's most dynamic businesses, with genuine opportunities to grow, lead and make a difference.":
        "Lake Group offre des carrières à fort impact : vous travaillerez au sein de l'une des entreprises les plus dynamiques d'Afrique de l'Est, avec de réelles opportunités de progresser, de diriger et de faire la différence.",
    "Lake Group surpasses 4,000 employees across 20+ subsidiaries, with 21 nationalities represented in the workforce. Mozambique operations begin.":
        "Lake Group dépasse les 4 000 employés dans plus de 20 filiales, avec 21 nationalités représentées dans l'effectif. Les opérations au Mozambique débutent.",
    "Lake Group's workforce reflects the rich diversity of the African continent, with 4,600+ professionals from 21 nationalities working together toward shared goals.":
        "L'effectif de Lake Group reflète la riche diversité du continent africain, avec plus de 4 600 professionnels de 21 nationalités travaillant ensemble vers des objectifs communs.",
    "Lake Lubes Ltd": "Lake Lubes Ltd", "Lake Lubes Ltd.": "Lake Lubes Ltd.",
    "Lake Lubes Ltd. manufactures and distributes a comprehensive range of lubricants serving automotive, industrial and marine sectors across East and Central Africa.":
        "Lake Lubes Ltd. fabrique et distribue une gamme complète de lubrifiants pour les secteurs automobile, industriel et marin en Afrique de l'Est et centrale.",
    "Lake Lubes Ltd.: Lubricants": "Lake Lubes Ltd. : Lubrifiants",
    "Lake Lubes Ltd.: Lubricants Manufacturing": "Lake Lubes Ltd. : Fabrication de lubrifiants",
    "Lake Oil Founded": "Fondation de Lake Oil",
    "Lake Oil Ltd": "Lake Oil Ltd", "Lake Oil Ltd.": "Lake Oil Ltd.",
    "Lake Oil Ltd.: Fuel Station Operations": "Lake Oil Ltd. : Exploitation de stations-service",
    "Lake Oil Ltd.: Petroleum Distribution": "Lake Oil Ltd. : Distribution de pétrole",
    "Lake Oil Ltd.: Petroleum Supply Operations": "Lake Oil Ltd. : Opérations d'approvisionnement en pétrole",
    "Lake Oil Stations": "Stations Lake Oil",
    "Lake Oil and Lake Trans jointly operate one of East Africa's largest petroleum supply chains, distributing fuel to 8 countries with 700+ trucks running 24/7.":
        "Lake Oil et Lake Trans exploitent conjointement l'une des plus grandes chaînes d'approvisionnement en pétrole d'Afrique de l'Est, distribuant du carburant à 8 pays avec plus de 700 camions fonctionnant 24h/24.",
    "Lake Oil: Arusha Town": "Lake Oil : Ville d'Arusha", "Lake Oil: Dodoma": "Lake Oil : Dodoma",
    "Lake Oil: Kariakoo": "Lake Oil : Kariakoo", "Lake Oil: Mikocheni": "Lake Oil : Mikocheni",
    "Lake Oil: Mwanza": "Lake Oil : Mwanza",
    "Lake Petroleum Ltd.": "Lake Petroleum Ltd.",
    "Lake Steel Launched": "Lancement de Lake Steel",
    "Lake Steel Ltd.": "Lake Steel Ltd.",
    "Lake Steel Ltd. becomes the first company in Tanzania to introduce High Strength, Corrosion Resistant (HS-CR) reinforcement steel bars. A fully computerised rolling mill with 100,000 MT/yr capacity.":
        "Lake Steel Ltd. devient la première entreprise en Tanzanie à introduire des barres d'armature haute résistance et résistantes à la corrosion (HS-CR). Un laminoir entièrement informatisé d'une capacité de 100 000 t/an.",
    "Lake Steel Ltd. is the <strong>first company in Tanzania</strong> to introduce unique High Strength, Corrosion Resistant (HS-CR) reinforcement steel bars, a game-changer for the East African construction industry.":
        "Lake Steel Ltd. est la <strong>première entreprise en Tanzanie</strong> à introduire des barres d'armature uniques à haute résistance et résistantes à la corrosion (HS-CR), un changement radical pour l'industrie de la construction en Afrique de l'Est.",
    "Lake Steel Ltd.: HS-CR Steel Rolling Mill": "Lake Steel Ltd. : Laminoir d'acier HS-CR",
    "Lake Steel Reaches Cumulative 500,000 MT Production Milestone": "Lake Steel atteint le cap cumulé de 500 000 tonnes de production",
    "Lake Steel Rolling Mill, Tanzania First": "Laminoir Lake Steel, première en Tanzanie",
    "Lake Trans Ltd": "Lake Trans Ltd", "Lake Trans Ltd.": "Lake Trans Ltd.",
    "Lake Trans Ltd. is established to handle bulk liquid haulage, rapidly expanding the Group's logistics footprint across Tanzania.":
        "Lake Trans Ltd. est créée pour gérer le transport de liquides en vrac, élargissant rapidement l'empreinte logistique du Groupe en Tanzanie.",
    "Lake Trans Ltd. is one of East Africa's largest logistics operators, running a fleet of 700+ trucks for bulk liquid haulage, general cargo and regional cross-border transport.":
        "Lake Trans Ltd. est l'un des plus grands opérateurs logistiques d'Afrique de l'Est, exploitant une flotte de plus de 700 camions pour le transport de liquides en vrac, de marchandises générales et le transport régional transfrontalier.",
    "Lake Trans Ltd.: Transport & Haulage": "Lake Trans Ltd. : Transport et acheminement",
    "Largest Petroleum Distributors in Tanzania": "Plus grands distributeurs de pétrole en Tanzanie",
    "Leads Lake Oil's petroleum distribution, retail network and corporate partnerships, representing the flagship company at major industry and community events across Tanzania.":
        "Dirige la distribution de pétrole, le réseau de détail et les partenariats d'entreprise de Lake Oil, représentant la société phare lors d'événements industriels et communautaires majeurs en Tanzanie.",
    "Light Commercial Vehicles": "Véhicules utilitaires légers",
    "LinkedIn": "LinkedIn",
    "Loaded & Dispatched": "Chargé et expédié",
    "Local CSR programmes active": "Programmes RSE locaux actifs",
    "Local Employment": "Emploi local",
    "Local jobs created": "Emplois locaux créés",
    "Local jobs created across 8 countries": "Emplois locaux créés dans 8 pays",
    "Locate the nearest Lake Oil fuel station, check opening hours and available services.":
        "Localisez la station-service Lake Oil la plus proche, consultez les horaires d'ouverture et les services disponibles.",
    "Logistics / Transport": "Logistique / Transport",
    "Logistics Coordinator": "Coordinateur logistique",
    "Logistics Division Launched": "Lancement de la division logistique",
    "Logistics Tracking": "Suivi logistique",
    "Low shrinkage formulation for slabs, pavements and structures where crack control is critical.":
        "Formulation à faible retrait pour dalles, revêtements et structures où le contrôle des fissures est essentiel.",
    "Lubricant blending plant in Dar es Salaam producing greases and engine oils for regional markets.":
        "Usine de formulation de lubrifiants à Dar es Salaam produisant des graisses et des huiles moteur pour les marchés régionaux.",
    "Lubricants & Lube Products": "Lubrifiants et produits lubrifiants",
    "MERM (Middle East Ready Mix LLC)": "MERM (Middle East Ready Mix LLC)",
    "MERM Dubai (10)": "MERM Dubaï (10)",
    "MERM Ready Mix, Dubai Expansion": "MERM Ready Mix, expansion à Dubaï",
    "MERM: Aggregate & Materials Storage, UAE": "MERM : Stockage de granulats et matériaux, EAU",
    "MERM: Batching Plant Operations, Dubai": "MERM : Opérations de centrale à béton, Dubaï",
    "MERM: Concrete Supply to UAE Construction Projects": "MERM : Approvisionnement en béton pour les projets de construction aux EAU",
    "MERM: Lake Group Middle East Operations": "MERM : Opérations de Lake Group au Moyen-Orient",
    "MERM: Middle East Ready Mix LLC": "MERM : Middle East Ready Mix LLC",
    "MERM: Middle East Ready Mix LLC, Dubai, UAE": "MERM : Middle East Ready Mix LLC, Dubaï, EAU",
    "MERM: Mixer Truck Fleet at Dubai Plant": "MERM : Flotte de camions-toupies à l'usine de Dubaï",
    "MERM: One of the Largest Premix Plants in the UAE": "MERM : L'une des plus grandes centrales à béton des EAU",
    "MERM: Quality Control Laboratory, Dubai": "MERM : Laboratoire de contrôle qualité, Dubaï",
    "MERM: Ready-Mix Concrete Fleet, Dubai": "MERM : Flotte de béton prêt à l'emploi, Dubaï",
    "MERM: Ready-Mix Concrete Production Line, UAE": "MERM : Ligne de production de béton prêt à l'emploi, EAU",
    "Major Facilities": "Installations majeures",
    "Manages major Group projects including Lake Agro's greenfield development and coordinates humanitarian relief efforts such as flood-response aid in Rufiji and coastal regions.":
        "Gère les grands projets du Groupe, notamment le développement de terrains vierges de Lake Agro, et coordonne les efforts d'aide humanitaire tels que l'aide en réponse aux inondations à Rufiji et dans les régions côtières.",
    "Managing Director · Lake Oil Tanzania": "Directeur général · Lake Oil Tanzanie",
    "Marine Lubricants": "Lubrifiants marins",
    "Marine environments": "Environnements marins",
    "Media Resources": "Ressources médias",
    "Middle East Ready Mix LLC (MERM), Lake Group's Dubai-based premix concrete operation, is one of the largest ready-mix plants in the UAE, serving major construction projects.":
        "Middle East Ready Mix LLC (MERM), l'exploitation de béton prêt à l'emploi de Lake Group basée à Dubaï, est l'une des plus grandes centrales à béton des EAU, au service de grands projets de construction.",
    "Mikocheni Light Industrial Area, Dar es Salaam": "Zone industrielle légère de Mikocheni, Dar es Salaam",
    "Mon–Sun 5:00am – 11:00pm  |  Petrol, Diesel, Lubricants": "Lun-Dim 5h00-23h00 | Essence, diesel, lubrifiants",
    "Mon–Sun 5:30am – 10:00pm  |  Petrol, Diesel, LPG": "Lun-Dim 5h30-22h00 | Essence, diesel, GPL",
    "Mon–Sun 6:00am – 9:00pm  |  Petrol, Diesel, Truck Diesel": "Lun-Dim 6h00-21h00 | Essence, diesel, diesel poids lourd",
    "Mr. Awadh established Lake Oil at age 27 and grew it into one of East and Central Africa's largest energy, logistics and industrial conglomerates, operating across Tanzania, Kenya, Zambia, DRC, Burundi, Rwanda, Ethiopia and Mozambique with 4,600+ employees from 21 nationalities.":
        "M. Awadh a fondé Lake Oil à 27 ans et en a fait l'un des plus grands conglomérats d'énergie, de logistique et industriels d'Afrique de l'Est et centrale, présent en Tanzanie, au Kenya, en Zambie, en RDC, au Burundi, au Rwanda, en Éthiopie et au Mozambique, avec plus de 4 600 employés de 21 nationalités.",
    "Multiple Locations": "Plusieurs sites", "Multiple Services": "Plusieurs services",
    "Mwanza City, Lake Victoria Region": "Ville de Mwanza, région du lac Victoria",
    "Nassoro Abubakari": "Nassoro Abubakari",
    "Network in Action": "Réseau en action",
    "No compromise on quality, from fuel and LPG to steel, lubricants and ready-mix concrete.":
        "Aucun compromis sur la qualité, du carburant et du GPL à l'acier, aux lubrifiants et au béton prêt à l'emploi.",
    "Not a corporate client?": "Vous n'êtes pas client professionnel ?",
    "Nov 5, 2024": "5 nov. 2024", "Oct 1, 2024": "1er oct. 2024",
    "Oil analysis, technical advice and maintenance support for corporate fleet customers.":
        "Analyse d'huile, conseils techniques et soutien à la maintenance pour les clients de flottes d'entreprise.",
    "One of the largest premix concrete plants in the UAE, serving major Dubai construction projects.":
        "L'une des plus grandes centrales à béton des EAU, au service de grands projets de construction à Dubaï.",
    "Ongoing investment in newer, fuel-efficient trucks, reducing per-kilometre emissions across our 700+ vehicle fleet while improving service reliability.":
        "Investissement continu dans des camions plus récents et économes en carburant, réduisant les émissions par kilomètre de notre flotte de plus de 700 véhicules tout en améliorant la fiabilité du service.",
    "Open Opportunities": "Postes ouverts",
    "Operating History": "Historique d'exploitation",
    "Operations (9)": "Opérations (9)",
    "Operations Across the Continent": "Opérations à travers le continent",
    "Operations across 8 high-growth East and Central African markets, some of the world's fastest-growing economies by GDP and population.":
        "Opérations dans 8 marchés à forte croissance d'Afrique de l'Est et centrale, parmi les économies à la croissance la plus rapide au monde en termes de PIB et de population.",
    "Order Confirmed": "Commande confirmée",
    "Order LPG Supply": "Commander un approvisionnement GPL",
    "Order Lubricants": "Commander des lubrifiants",
    "Our Depot Locations": "Nos emplacements de dépôt",
    "Our HS-CR bars maintain strength at temperatures up to 600°C, compared to 350°C for ordinary rebars, providing critical fire resistance advantages for major construction projects.":
        "Nos barres HS-CR conservent leur résistance jusqu'à 600 °C, contre 350 °C pour les barres ordinaires, offrant des avantages essentiels en matière de résistance au feu pour les grands projets de construction.",
    "Our LPG Cylinders": "Nos bouteilles GPL",
    "Our Plant in Action": "Notre usine en action",
    "Our financial strength, high credit rating in the global business community, and diversified revenue streams across energy, logistics and construction materials make Lake Group a resilient and high-potential investment.":
        "Notre solidité financière, notre excellente notation de crédit dans la communauté commerciale mondiale et nos sources de revenus diversifiées dans l'énergie, la logistique et les matériaux de construction font de Lake Group un investissement résilient à fort potentiel.",
    "Our innovative composite cylinder range, launched in Dar es Salaam, marks a new revolution in cooking gas technology, combining safety with aesthetics.":
        "Notre gamme innovante de bouteilles composites, lancée à Dar es Salaam, marque une nouvelle révolution dans la technologie du gaz de cuisson, combinant sécurité et esthétique.",
    "Our leadership team brings together decades of expertise across energy, logistics, finance and engineering.":
        "Notre équipe de direction réunit des décennies d'expertise dans l'énergie, la logistique, la finance et l'ingénierie.",
    "Our lubricants are formulated to meet international standards, providing superior protection and performance even in Africa's most demanding operating environments.":
        "Nos lubrifiants sont formulés pour répondre aux normes internationales, offrant une protection et des performances supérieures même dans les environnements d'exploitation les plus exigeants d'Afrique.",
    "Our petrol stations are instantly recognisable in <strong>eye-catching blue, white, yellow and red</strong>, the same bold Lake Group colours you'll see on the map below.":
        "Nos stations-service sont immédiatement reconnaissables en <strong>bleu, blanc, jaune et rouge accrocheurs</strong>, les mêmes couleurs audacieuses de Lake Group que vous verrez sur la carte ci-dessous.",
    "Our sales team is available Mon–Fri 9:00–18:00 EAT.": "Notre équipe commerciale est disponible du lundi au vendredi de 9h00 à 18h00 (heure d'Afrique de l'Est).",
    "Our state-of-the-art, fully computerised and automatic Steel Rolling Mill plant has a production capacity of up to <strong>25 tonnes per hour</strong>, translating to an annual capacity of <strong>100,000 metric tonnes</strong> of high-quality steel bars.":
        "Notre laminoir d'acier de pointe, entièrement informatisé et automatique, a une capacité de production allant jusqu'à <strong>25 tonnes par heure</strong>, soit une capacité annuelle de <strong>100 000 tonnes métriques</strong> de barres d'acier de haute qualité.",
    "Our sustainability strategy covers environmental stewardship, clean cooking energy access, land reclamation, waste management and progressive decarbonisation of our logistics fleet.":
        "Notre stratégie de durabilité couvre la gérance environnementale, l'accès à une énergie de cuisson propre, la réhabilitation des terres, la gestion des déchets et la décarbonisation progressive de notre flotte logistique.",
    "Our team reviews it": "Notre équipe l'examine",
    "Over 700 purpose-built trucks operating 24/7 across East and Central Africa, the backbone of our logistics operations.":
        "Plus de 700 camions spécialement conçus fonctionnant 24h/24 en Afrique de l'Est et centrale, l'épine dorsale de nos opérations logistiques.",
    "Oversees Group-wide executive operations and represents Lake Group at CSR initiatives, hospital donations and community outreach programmes across Dar es Salaam.":
        "Supervise les opérations exécutives à l'échelle du Groupe et représente Lake Group lors d'initiatives RSE, de dons hospitaliers et de programmes communautaires à Dar es Salaam.",
    "Own storage facilities, truck fleet (700+), rolling mill, concrete plants, quarry and container depots, significant hard-asset base.":
        "Installations de stockage propres, flotte de camions (plus de 700), laminoir, centrales à béton, carrière et dépôts de conteneurs : une base d'actifs corporels importante.",
    "Pan-African Footprint": "Empreinte panafricaine",
    "Pan-African Impact": "Impact panafricain",
    "Pan-African Petroleum Supply Chain": "Chaîne d'approvisionnement pétrolier panafricaine",
    "Pan-African Supply Chain Operations": "Opérations de chaîne d'approvisionnement panafricaine",
    "Permeable concrete for sustainable drainage in car parks, roads and landscaping.":
        "Béton perméable pour un drainage durable dans les parkings, routes et aménagements paysagers.",
    "Pervious Concrete": "Béton perméable",
    "Petroleum Engineer": "Ingénieur pétrolier",
    "Petroleum Products across East Africa": "Produits pétroliers en Afrique de l'Est",
    "Petroleum, 50,000L": "Pétrole, 50 000 L",
    "Piling & Foundation Concrete": "Béton pour pieux et fondations",
    "Place New Order": "Passer une nouvelle commande",
    "Plot 49, Mikocheni Light Industrial, Dar es Salaam": "Plot 49, Mikocheni Light Industrial, Dar es Salaam",
    "Port Extension Services": "Services d'extension portuaire",
    "Position of Interest": "Poste recherché",
    "Powering homes, restaurants and industry across 7 East African countries with safe, reliable LPG cylinders.":
        "Alimenter les foyers, restaurants et industries de 7 pays d'Afrique de l'Est avec des bouteilles GPL sûres et fiables.",
    "Prefer to call?": "Vous préférez appeler ?",
    "Press releases, official statements, corporate videos and downloadable media assets for Lake Group.":
        "Communiqués de presse, déclarations officielles, vidéos d'entreprise et ressources médias téléchargeables pour Lake Group.",
    "Pressure Certified": "Certifié sous pression",
    "Product Categories": "Catégories de produits",
    "Production Capacity": "Capacité de production",
    "Production Process": "Processus de production",
    "Professionalism is the culture we cherish, 4,600+ staff from 21 nationalities, one team.":
        "Le professionnalisme est la culture que nous chérissons : plus de 4 600 employés de 21 nationalités, une seule équipe.",
    "Projects Manager · Lake Group": "Chef de projets · Lake Group",
    "Proven Vertical Growth": "Croissance verticale avérée",
    "Purpose-Built for Africa's Roads": "Conçu pour les routes d'Afrique",
    "Purpose-Built for Every Load": "Conçu pour chaque charge",
    "Quality testing to national and international standards before dispatch.":
        "Tests de qualité selon les normes nationales et internationales avant expédition.",
    "Quarry Land Reclamation": "Réhabilitation des terres de carrière",
    "Raw Material Testing": "Tests des matières premières",
    "Reach stackers, terminal tractors and container trucks for AFICD inland depot operations in Tanzania, Zambia and Mozambique.":
        "Chariots cavaliers, tracteurs de terminal et camions à conteneurs pour les opérations de dépôt intérieur AFICD en Tanzanie, en Zambie et au Mozambique.",
    "Ready-Mix Concrete": "Béton prêt à l'emploi",
    "Ready-Mix Concrete & Aggregate": "Béton prêt à l'emploi et granulats",
    "Ready-Mix Concrete / Aggregate": "Béton prêt à l'emploi / granulats",
    "Ready-mix concrete and aggregates, market leader in Dar es Salaam premix supply.":
        "Béton prêt à l'emploi et granulats, leader du marché de l'approvisionnement en béton à Dar es Salaam.",
    "Real photos from our operations, GCCP concrete plant, MERM Dubai, LPG cylinders, fuel operations and more.":
        "Photos réelles de nos opérations, de la centrale à béton GCCP, de MERM Dubaï, des bouteilles GPL, des opérations de carburant et plus encore.",
    "Real photos sourced directly from lakeoilgroup.com, our operations across East Africa and the Middle East.":
        "Photos réelles provenant directement de lakeoilgroup.com, de nos opérations en Afrique de l'Est et au Moyen-Orient.",
    "Regional Expansion Begins": "Début de l'expansion régionale",
    "Regional Presence": "Présence régionale",
    "Request Concrete Quote": "Demander un devis béton",
    "Request Container Quote": "Demander un devis conteneur",
    "Request Steel Quote": "Demander un devis acier",
    "Request Transport Quote": "Demander un devis transport",
    "Request a Transport Quote": "Demander un devis de transport",
    "Response within 1 business day": "Réponse dans un jour ouvrable",
    "Responsible Growth. Lasting Impact.": "Croissance responsable. Impact durable.",
    "Responsible handling of petroleum products, zero-tolerance for spillage, and progressive adoption of cleaner operations. Active reclamation of quarry land at Lugoba.":
        "Manutention responsable des produits pétroliers, tolérance zéro envers les déversements et adoption progressive d'opérations plus propres. Réhabilitation active des terres de carrière à Lugoba.",
    "SAFF: Aggregates": "SAFF : Granulats",
    "Safety is first in all we do, across depots, haulage fleets, LPG terminals and construction sites.":
        "La sécurité est notre priorité dans tout ce que nous faisons : dépôts, flottes de transport, terminaux GPL et chantiers de construction.",
    "Saline sub-soil": "Sous-sol salin",
    "Scholarships and skills programmes": "Bourses et programmes de compétences",
    "Search by city or region": "Rechercher par ville ou région",
    "Select a Country": "Sélectionner un pays",
    "Select a service": "Sélectionner un service",
    "Select your country": "Sélectionnez votre pays",
    "Self-Consolidating Concrete (SCC)": "Béton auto-plaçant (BAP)",
    "Senior Leadership": "Direction senior",
    "Service Regions": "Régions de service",
    "Service Required *": "Service requis *",
    "Services Offered": "Services proposés",
    "Services Subscribed": "Services souscrits",
    "Shipment Tracker": "Suivi des expéditions",
    "Sign In to Your Account": "Connectez-vous à votre compte",
    "Specialised bulk liquid tankers for safe petroleum transport, fully compliant with regional hazmat regulations.":
        "Camions-citernes spécialisés pour le transport sécurisé de liquides en vrac, entièrement conformes aux réglementations régionales sur les matières dangereuses.",
    "Specialised pressurised tankers for bulk LPG transport between bottling plants and distribution points across East Africa.":
        "Camions-citernes pressurisés spécialisés pour le transport de GPL en vrac entre les usines d'embouteillage et les points de distribution en Afrique de l'Est.",
    "Specialist Concrete Portfolio": "Portefeuille de béton spécialisé",
    "Specialist marine engine oils and gear lubricants for Lake Victoria and coastal vessels.":
        "Huiles moteur marines spécialisées et lubrifiants pour engrenages destinés aux navires du lac Victoria et côtiers.",
    "Spread Across Every Corner of East & Central Africa": "Présent dans tous les coins de l'Afrique de l'Est et centrale",
    "Station Services Include": "Les services en station comprennent",
    "Steel (Rebar / HS-CR)": "Acier (armature / HS-CR)",
    "Steel Manufacturing": "Fabrication d'acier",
    "Steel Rebar, 120MT": "Armature en acier, 120 t",
    "Steel manufacturing including HS-CR rebars and construction materials for infrastructure projects.":
        "Fabrication d'acier, y compris les armatures HS-CR et les matériaux de construction pour les projets d'infrastructure.",
    "Strategic port logistics for Beira corridor trade flows": "Logistique portuaire stratégique pour les flux commerciaux du corridor de Beira",
    "Strong Leadership": "Direction solide",
    "Stronger than Standard": "Plus résistant que la norme",
    "Submit Application": "Soumettre la candidature",
    "Submit Enquiry →": "Soumettre la demande →",
    "Submit your requirements and our team will respond within 24 hours with a tailored proposal.":
        "Soumettez vos besoins et notre équipe vous répondra dans les 24 heures avec une proposition personnalisée.",
    "Support fleet of pickups, service vehicles and supervisor cars for field operations, maintenance and last-mile delivery support.":
        "Flotte de soutien de pick-up, véhicules de service et voitures de supervision pour les opérations sur le terrain, la maintenance et le soutien à la livraison du dernier kilomètre.",
    "Supporting reliable LPG access for households across East Africa, reducing dependence on charcoal, improving air quality and lowering deforestation pressure.":
        "Soutenir un accès fiable au GPL pour les foyers d'Afrique de l'Est, réduisant la dépendance au charbon de bois, améliorant la qualité de l'air et réduisant la pression de déforestation.",
    "Supporting scholarships, vocational training and STEM education for youth in Tanzania and across the region, building the next generation of energy professionals.":
        "Soutenir les bourses, la formation professionnelle et l'éducation STEM pour les jeunes en Tanzanie et dans toute la région, formant la prochaine génération de professionnels de l'énergie.",
    "Sustainability Enquiries": "Demandes sur la durabilité",
    "Sustainability by the Numbers": "La durabilité en chiffres",
    "TZ / ZM / MZ": "TZ / ZM / MZ",
    "TZS (Tanzanian Shilling)": "TZS (Shilling tanzanien)",
    "Tailored proposal within 24 hours": "Proposition personnalisée dans les 24 heures",
    "Tanzania Energy Forum 2025": "Forum de l'énergie de Tanzanie 2025",
    "Tanzania's first HS-CR rebar manufacturer, Lake Steel Ltd., has celebrated a major production milestone, 500,000 metric tonnes of high-strength corrosion-resistant rebars since commissioning.":
        "Premier fabricant tanzanien d'armatures HS-CR, Lake Steel Ltd. a célébré une étape majeure de production : 500 000 tonnes métriques d'armatures haute résistance résistantes à la corrosion depuis sa mise en service.",
    "Tanzania's first HS-CR rebar producer. The fully computerised 25T/hr rolling mill has supplied 100,000+ MT of high-strength corrosion-resistant steel to the construction sector.":
        "Premier producteur tanzanien d'armatures HS-CR. Le laminoir entièrement informatisé de 25 t/h a fourni plus de 100 000 tonnes d'acier haute résistance résistant à la corrosion au secteur de la construction.",
    "Tanzania's first producer of HS-CR reinforcement steel bars. Fully computerised rolling mill with 100,000 MT annual capacity.":
        "Premier producteur tanzanien de barres d'armature HS-CR. Laminoir entièrement informatisé d'une capacité annuelle de 100 000 tonnes.",
    "Tell Us What You Need": "Dites-nous ce dont vous avez besoin",
    "Tell us about yourself and what you bring to Lake Group...": "Parlez-nous de vous et de ce que vous apportez à Lake Group...",
    "Territories incl. Dubai": "Territoires incl. Dubaï",
    "The Backbone of East Africa's Supply Chain": "L'épine dorsale de la chaîne d'approvisionnement d'Afrique de l'Est",
    "The Group is privately held, headquartered in Tanzania, and has a direct economic impact in every market it operates, supporting local employment, supply chains and infrastructure development.":
        "Le Groupe est une entreprise privée, basée en Tanzanie, qui a un impact économique direct sur chaque marché où il opère, soutenant l'emploi local, les chaînes d'approvisionnement et le développement des infrastructures.",
    "The Inland Gateway to East African Trade": "La porte d'entrée intérieure du commerce d'Afrique de l'Est",
    "The Lake Group Story": "L'histoire de Lake Group",
    "The Lake Trans Fleet": "La flotte Lake Trans",
    "The executives overseeing Lake Group's day-to-day operations, people and strategic growth.":
        "Les dirigeants supervisant les opérations quotidiennes, le personnel et la croissance stratégique de Lake Group.",
    "The same principles that power our homepage, quality, service, safety and professionalism, guide every market we operate in.":
        "Les mêmes principes qui animent notre page d'accueil, qualité, service, sécurité et professionnalisme, guident chaque marché où nous opérons.",
    "The visionaries and industry professionals driving Lake Group's growth across East and Central Africa.":
        "Les visionnaires et professionnels du secteur qui propulsent la croissance de Lake Group en Afrique de l'Est et centrale.",
    "Tolerance for petroleum spillage incidents": "Tolérance pour les incidents de déversement de pétrole",
    "Tomorrow 14:00": "Demain 14h00",
    "Track Your Shipment": "Suivez votre expédition",
    "Track a Shipment": "Suivre une expédition",
    "Track your Lake Trans delivery using your tracking ID or truck registration number.":
        "Suivez votre livraison Lake Trans à l'aide de votre numéro de suivi ou d'immatriculation du camion.",
    "Truck Driver (Class C)": "Chauffeur de camion (catégorie C)",
    "Truck Mixers (12m³)": "Camions-toupies (12 m³)",
    "Truck Registration Number": "Numéro d'immatriculation du camion",
    "Trucks on the Road": "Camions sur la route",
    "USD ($)": "USD ($)",
    "Ultra-Rapid Hardening Concrete": "Béton à durcissement ultra-rapide",
    "Under his leadership the Group has expanded into Lake Trans, Lake Gas, Lake Lubes, Lake Steel, Gulf Cement & Concrete Products, African Inland Container Depot and regional oil storage and retail networks.":
        "Sous sa direction, le Groupe s'est étendu à Lake Trans, Lake Gas, Lake Lubes, Lake Steel, Gulf Cement & Concrete Products, African Inland Container Depot et aux réseaux régionaux de stockage et de vente au détail de pétrole.",
    "Upcoming Events": "Événements à venir",
    "Upload CV (PDF)": "Téléverser le CV (PDF)",
    "Uploaded: Dec 16, 2024": "Téléversé : 16 déc. 2024",
    "Uploaded: Dec 20, 2024": "Téléversé : 20 déc. 2024",
    "Versatile flatbed and curtain-side trailers for steel, construction materials, containers and oversized cargo across the region.":
        "Remorques plateaux et à rideaux coulissants polyvalentes pour l'acier, les matériaux de construction, les conteneurs et le fret hors normes dans la région.",
    "View Africa Network": "Voir le réseau Afrique",
    "View CSR Initiatives": "Voir les initiatives RSE",
    "View Our Full Fleet": "Voir notre flotte complète",
    "Wadi Elsundus Petroleum Co.": "Wadi Elsundus Petroleum Co.",
    "We are always looking for talented, driven professionals to join our growing team across East and Central Africa.":
        "Nous recherchons toujours des professionnels talentueux et motivés pour rejoindre notre équipe en pleine croissance en Afrique de l'Est et centrale.",
    "We believe that business growth and community development go hand in hand, and that our success must translate into tangible benefits for the people and environments in which we operate.":
        "Nous croyons que la croissance des affaires et le développement communautaire vont de pair, et que notre succès doit se traduire par des avantages tangibles pour les personnes et les environnements dans lesquels nous opérons.",
    "We receive your enquiry": "Nous recevons votre demande",
    "What Drives Our Value": "Ce qui anime notre valeur",
    "What Happens Next?": "Que se passe-t-il ensuite ?",
    "What's happening at announcements, expansions, product launches and community activities.":
        "Ce qui se passe : annonces, expansions, lancements de produits et activités communautaires.",
    "Why Lake Group Stands Out Across Africa": "Pourquoi Lake Group se distingue en Afrique",
    "Why Work With Us": "Pourquoi travailler avec nous",
    "With 4,600+ employees across 8 countries and 21 nationalities, we are a truly pan-African team united by shared values: Quality, Service, Safety and Professionalism.":
        "Avec plus de 4 600 employés dans 8 pays et 21 nationalités, nous sommes une équipe véritablement panafricaine unie par des valeurs communes : qualité, service, sécurité et professionnalisme.",
    "With operations in Tanzania, Zambia and Mozambique, our container services are positioned at strategic corridors to serve regional importers, exporters and shipping lines.":
        "Avec des opérations en Tanzanie, en Zambie et au Mozambique, nos services de conteneurs sont positionnés sur des corridors stratégiques pour servir les importateurs, exportateurs et compagnies maritimes régionaux.",
    "Within 4 working hours": "Dans les 4 heures ouvrables",
    "Work alongside 21 nationalities across 8 countries": "Travaillez aux côtés de 21 nationalités dans 8 pays",
    "Work on projects that shape East Africa's development": "Travaillez sur des projets qui façonnent le développement de l'Afrique de l'Est",
    "X / Twitter": "X / Twitter", "YouTube": "YouTube",
    "Your Lake Group corporate account overview, track orders, manage deliveries and access account documents.":
        "Aperçu de votre compte professionnel Lake Group : suivez vos commandes, gérez vos livraisons et accédez aux documents de compte.",
    "ZMW (Zambian Kwacha)": "ZMW (Kwacha zambien)",
    "Zero Spillage Policy": "Politique de zéro déversement",
    "admin@lakeoilgroup.com": "admin@lakeoilgroup.com",
    "e.g. 50,000 litres / month, 500 MT steel": "ex. 50 000 litres / mois, 500 t d'acier",
    "e.g. Dar es Salaam, Arusha, Mwanza...": "ex. Dar es Salaam, Arusha, Mwanza...",
    "e.g. LT-2024-00847": "ex. LT-2024-00847",
    "e.g. T 123 ABC": "ex. T 123 ABC",
    "eye-catching blue, white, yellow and red": "bleu, blanc, jaune et rouge accrocheurs",
    "first company in Tanzania": "première entreprise en Tanzanie",
    "media@lakeoilgroup.com": "media@lakeoilgroup.com",
    "m³ Aggregate / Month": "m³ de granulats / mois",
    "m³ aggregate monthly, supporting sustainable construction": "m³ de granulats par mois, soutenant une construction durable",
    "your@company.com": "votreentreprise@exemple.com",
    "••••••••": "••••••••",
    "⟲ East Africa": "⟲ Afrique de l'Est",
    "🇧🇮 Burundi": "🇧🇮 Burundi", "🇨🇩 DRC": "🇨🇩 RDC", "🇪🇹 Ethiopia": "🇪🇹 Éthiopie",
    "🇰🇪 Kenya": "🇰🇪 Kenya", "🇲🇿 Mozambique": "🇲🇿 Mozambique", "🇷🇼 Rwanda": "🇷🇼 Rwanda",
    "🇹🇿 Tanzania": "🇹🇿 Tanzanie", "🇿🇲 Zambia": "🇿🇲 Zambie",
    "📍 Station Locator": "📍 Localisateur de stations",
    "📞 Call +255 222 780 510": "📞 Appelez le +255 222 780 510",
    "🛡️": "🛡️",
    "It started<br>with one tank.": "Tout a commencé<br>avec un seul réservoir.",
    "At 27 years old, Ally Edha Awadh opened a single fuel outlet in Dar es Salaam. No fleet, no network, no certainty. Just a belief that East Africa deserved a more reliable energy supply chain.":
        "À 27 ans, Ally Edha Awadh a ouvert une seule station-service à Dar es Salaam. Pas de flotte, pas de réseau, aucune certitude. Juste la conviction que l'Afrique de l'Est méritait une chaîne d'approvisionnement énergétique plus fiable.",
    "Ally Edha Awadh, Founder &amp; Chairman": "Ally Edha Awadh, fondateur et président",
    "from one truck": "d'un seul camion",
    "to a fleet of<br><em>700+.</em>": "à une flotte de<br><em>plus de 700.</em>",
    "Lake Trans: bulk haulage across East Africa": "Lake Trans : transport en vrac en Afrique de l'Est",
    "and along the way": "et en chemin",
    "we brought clean<br>energy <em>home.</em>": "nous avons apporté une énergie<br>propre <em>à la maison.</em>",
    "Lake Gas now supplies LPG cylinders to seven countries, displacing charcoal stoves and giving families a safer way to cook.":
        "Lake Gas fournit désormais des bouteilles de GPL à sept pays, remplaçant les foyers à charbon de bois et offrant aux familles un moyen de cuisiner plus sûr.",
    "eight sectors, one vision": "huit secteurs, une seule vision",
    "We built more than<br>a fuel company.": "Nous avons bâti plus<br>qu'une entreprise pétrolière.",
    "GCCP: Dar es Salaam's leading ready-mix concrete supplier": "GCCP : premier fournisseur de béton prêt à l'emploi de Dar es Salaam",
    "Every depot, every truck, every cylinder is run by people. 4,600+ of them, from 21 nationalities, across 8 countries. That's the part no spreadsheet can capture.":
        "Chaque dépôt, chaque camion, chaque bouteille est géré par des personnes. Plus de 4 600 d'entre elles, de 21 nationalités, dans 8 pays. C'est la partie qu'aucun tableau ne peut saisir.",
    "our team, our story": "notre équipe, notre histoire",
    "today": "aujourd'hui",
    "across <em>8 countries</em><br>and counting.": "dans <em>8 pays</em><br>et toujours plus.",
    "Tanzania &middot; Kenya &middot; Zambia &middot; Rwanda &middot; Burundi &middot; DRC &middot; Ethiopia &middot; Mozambique":
        "Tanzanie &middot; Kenya &middot; Zambie &middot; Rwanda &middot; Burundi &middot; RDC &middot; Éthiopie &middot; Mozambique",
    "Lake Group.": "Lake Group.",
    "Quality. Service. Safety. Professionalism.<br>Powering East &amp; Central Africa since 2006.":
        "Qualité. Service. Sécurité. Professionnalisme.<br>Propulser l'Afrique de l'Est et centrale depuis 2006.",
    "still growing": "toujours en croissance",
    "eighteen years in": "dix-huit ans plus tard",
    "\"From a single fuel outlet to one of East Africa's largest energy and industrial conglomerates.\"":
        "« D'une seule station-service à l'un des plus grands conglomérats d'énergie et industriels d'Afrique de l'Est. »",
    "&#8635; &nbsp; watch again": "&#8635; &nbsp; revoir",
    "tap to skip &rarr;": "appuyer pour passer &rarr;",
    "Next scene": "Scène suivante",
    "$850M": "850 M$",
    "100K": "100 k",
    "18yrs": "18 ans",
    "250T/hr": "250 t/h",
    "25T/hr": "25 t/h",
    "30K": "30 k",
    "4.6K+": "4,6 k+",
    "600°C": "600 °C",
    "Dec 10, 2024": "10 déc. 2024",
    "Dec 12, 2024": "12 déc. 2024",
    "Dec 15, 2024": "15 déc. 2024",
    "Dec 3, 2024": "3 déc. 2024",
    "Dec 8, 2024": "8 déc. 2024",
    "Mon–Sun 5:00am – 11:00pm \xa0|\xa0 Petrol, Diesel, Lubricants": "Lun-Dim 5h00-23h00 | Essence, diesel, lubrifiants",
    "Mon–Sun 5:30am – 10:00pm \xa0|\xa0 Petrol, Diesel, LPG": "Lun-Dim 5h30-22h00 | Essence, diesel, GPL",
    "Mon–Sun 6:00am – 9:00pm \xa0|\xa0 Petrol, Diesel, Truck Diesel": "Lun-Dim 6h00-21h00 | Essence, diesel, diesel poids lourd",
    # --- High-frequency reused strings (batch 3) ---
    "© 2026 Lake Group. <span data-i18n=\"footer.rights\">All rights reserved.</span>":
        "© 2026 Lake Group. <span data-i18n=\"footer.rights\">Tous droits réservés.</span>",
    "Usage:": "Utilisation :", "Target:": "Cible :", "Channel:": "Canal :",
    "Ongoing": "En cours", "Operations": "Opérations", "Experience": "Expérience",
    "Tracking ID": "Numéro de suivi", "Your name": "Votre nom",
    "Truck Diesel": "Diesel camion", "Media Center": "Centre média",
    "Photo Library": "Bibliothèque photo", "Product Range": "Gamme de produits",
    "Sustainability": "Durabilité", "Professionalism": "Professionnalisme",
    "Search Stations": "Rechercher des stations", "Media Enquiries": "Demandes médias",
    "Meet Leadership": "Rencontrer la direction", "Petrol & Diesel": "Essence et diesel",
    "LPG & Gas Tankers": "Camions GPL et gaz", "Petroleum Tankers": "Camions-citernes pétroliers",
    "Flatbed & Cargo Trucks": "Camions plateaux et fret",
    "Ready to Work Together?": "Prêts à collaborer ?",
    "AFICD: Inland Container Depot": "AFICD : dépôt de conteneurs intérieur",
    "Talk to our team about fuel supply, logistics, or any of our services across East Africa.":
        "Parlez à notre équipe de l'approvisionnement en carburant, de la logistique ou de l'un de nos services en Afrique de l'Est.",
    "All": "Tous", "New": "Nouveau", "Flow": "Flux", "Ports": "Ports",
    "Events": "Événements", "Sports": "Sports", "Finance": "Finance",
    "Subject": "Sujet", "Storage": "Stockage", "Country": "Pays",
    "Heating": "Chauffage", "Company:": "Entreprise :", "Timeline": "Chronologie",
    "Password": "Mot de passe", "Progress": "Progression", "Order ID": "N° de commande",
    "Sign Out": "Déconnexion", "Message *": "Message *",
    "Last-Mile": "Dernier kilomètre", "Our Story": "Notre histoire",
    "Portfolio": "Portefeuille", "Formation": "Formation",
    "Our Values": "Nos valeurs", "Account #:": "Compte n° :",
    "News Story": "Article", "Our People": "Nos collaborateurs",
    "Need Help?": "Besoin d'aide ?", "What We Do": "Ce que nous faisons",
    "Since 2006": "Depuis 2006", "View map →": "Voir la carte →",
    "Industrial": "Industriel", "✉ Email Us": "✉ Envoyez-nous un e-mail",
    "Our Vision": "Notre vision", "Our Pledge": "Notre engagement",
    "Translucent": "Translucide", "Real Estate": "Immobilier",
    "Quality": "Qualité", "Safety": "Sécurité",
    "Africa Network": "Réseau africain", "Dubai, UAE": "Dubaï, É.A.U.",
    "Dar es Salaam, Tanzania": "Dar es Salaam, Tanzanie",
    "Tanzania HQ": "Siège Tanzanie", "7 Countries": "7 pays", "5 Countries": "5 pays",
    "1 Subsidiary": "1 filiale", "2 Subsidiaries": "2 filiales", "3 Subsidiaries": "3 filiales",
    "4 Subsidiaries": "4 filiales", "5 Subsidiaries": "5 filiales",
    "1 subsidiary": "1 filiale", "2 subsidiaries": "2 filiales", "3 subsidiaries": "3 filiales",
    "4 subsidiaries": "4 filiales", "5 subsidiaries": "5 filiales",
    "Lake Oil LDA": "Lake Oil LDA", "Lusaka, Zambia": "Lusaka, Zambie",
    "Nairobi, Kenya": "Nairobi, Kenya",
    "Mon–Sun 6:00am – 10:00pm \u00a0|\u00a0 Petrol, Diesel, LPG":
        "Lun-Dim 6h00-22h00 \u00a0|\u00a0 Essence, diesel, GPL",
    "<span class=\"marquee-sep\"></span>Ready-Mix Concrete": "<span class=\"marquee-sep\"></span>Béton prêt à l'emploi",
    "<span class=\"marquee-sep\"></span>HS-CR Steel Rebars": "<span class=\"marquee-sep\"></span>Barres d'armature HS-CR",
    "<span class=\"marquee-sep\"></span>Bulk Liquid Haulage": "<span class=\"marquee-sep\"></span>Transport de liquides en vrac",
    "<span class=\"marquee-sep\"></span>8 Countries & Growing": "<span class=\"marquee-sep\"></span>8 pays et en croissance",
    "<span class=\"marquee-sep\"></span>Tanzania Headquarters": "<span class=\"marquee-sep\"></span>Siège en Tanzanie",
    "<span class=\"marquee-sep\"></span>Mozambique · Dubai UAE": "<span class=\"marquee-sep\"></span>Mozambique · Dubaï É.A.U.",
    "<span class=\"marquee-sep\"></span>Petroleum Distribution": "<span class=\"marquee-sep\"></span>Distribution de pétrole",
    "<span class=\"marquee-sep\"></span>Kenya · Zambia · Rwanda": "<span class=\"marquee-sep\"></span>Kenya · Zambie · Rwanda",
    "<span class=\"marquee-sep\"></span>Container Depot Services": "<span class=\"marquee-sep\"></span>Services de dépôt de conteneurs",
    "<span class=\"marquee-sep\"></span>Burundi · DRC · Ethiopia": "<span class=\"marquee-sep\"></span>Burundi · RDC · Éthiopie",
    "<span class=\"marquee-sep\"></span>Lubricants Manufacturing": "<span class=\"marquee-sep\"></span>Fabrication de lubrifiants",
    "<span class=\"marquee-sep\"></span>LPG Bottling & Distribution": "<span class=\"marquee-sep\"></span>Embouteillage et distribution de GPL",
    "<span class=\"marquee-sep\"></span>700+ Trucks · 4,600+ Employees": "<span class=\"marquee-sep\"></span>700+ camions · 4 600+ employés",
    "<span class=\"marquee-sep\"></span>85+ Fuel Stations, Blue, White, Yellow & Red": "<span class=\"marquee-sep\"></span>85+ stations-service, bleu, blanc, jaune et rouge",
    "4,600+ employees": "4 600+ employés", "Mar 2025": "Mars 2025", "Jan 2025": "Janvier 2025",
    "20 units": "20 unités", "MT / Year": "T/an", "700 trucks": "700 camions",
    "39 Photos": "39 photos",
    # --- Batch 4: short labels and UI strings ---
    "Lightweight": "Léger", "Engineering": "Ingénierie",
    "Our Mission": "Notre mission", "Recent News": "Actualités récentes",
    "GPS Tracked": "Suivi GPS", "Our Pillars": "Nos piliers",
    "Track Record": "Bilan", "Safety First": "La sécurité avant tout",
    "View Gallery": "Voir la galerie", "Office Hours": "Heures d'ouverture",
    "Our Services": "Nos services", "Rolling Mill": "Laminoir",
    "Total Trucks": "Total des camions", "Cross-border": "Transfrontalier",
    "Pending Docs": "Documents en attente", "Manufacturing": "Fabrication",
    "Credit Limit:": "Limite de crédit :", "Recent Orders": "Commandes récentes",
    "QA & Dispatch": "Assurance qualité et expédition", "Mill Capacity": "Capacité du laminoir",
    "ADR Compliant": "Conforme ADR", "Press & Media": "Presse et médias",
    "Non-Corrosive": "Non corrosif", "Non-Explosive": "Non explosif",
    "Operations Map": "Carte des opérations", "Our Businesses": "Nos activités",
    "Your full name": "Votre nom complet", "Phone Number *": "Numéro de téléphone *",
    "Concrete Pumps": "Pompes à béton", "Our Commitment": "Notre engagement",
    "Our Operations": "Nos opérations", "Send Message →": "Envoyer le message →",
    "Press Releases": "Communiqués de presse", "Online Enquiry": "Demande en ligne",
    "Tyre Inflation": "Gonflage des pneus", "Port Certified": "Certifié portuaire",
    "Port Logistics": "Logistique portuaire", "What Drives Us": "Ce qui nous motive",
    "Read Our Story": "Lire notre histoire", "Request access": "Demander l'accès",
    "Send a Message": "Envoyer un message", "Partner With Us": "Devenir partenaire",
    "Up to 40 tonnes": "Jusqu'à 40 tonnes",
    "Our Story": "Notre histoire",
    "GCCP Facility": "Installation GCCP", "Cross-border corridors": "Corridors transfrontaliers",
    "Press releases, company announcements and media resources from Lake Group.":
        "Communiqués de presse, annonces d'entreprise et ressources médias de Lake Group.",
    # --- Homepage (index.html) batch ---
    "From Drop to <span>LAKE OIL</span>": "De la goutte à <span>LAKE OIL</span>",
    "<strong>Formation</strong>Precision-refined fuel, ready for distribution.":
        "<strong>Formation</strong>Carburant raffiné avec précision, prêt à être distribué.",
    "<strong>Flow</strong>Bulk haulage through 700+ Lake Trans trucks.":
        "<strong>Flux</strong>Transport en vrac par plus de 700 camions Lake Trans.",
    "<strong>Storage</strong>LAKE OIL terminals filling across 8 countries.":
        "<strong>Stockage</strong>Remplissage des terminaux LAKE OIL dans 8 pays.",
    "Fueling <span>Progress</span>": "Alimenter le <span>progrès</span>",
    "Founded by CEO & Chairman <strong>Ally Edha Awadh</strong> in 2006 at just 27 years old, Lake Group has grown from a single fuel outlet into one of East and Central Africa's largest energy, logistics and industrial conglomerates.":
        "Fondé par le PDG et président <strong>Ally Edha Awadh</strong> en 2006, à seulement 27 ans, Lake Group est passé d'une seule station-service à l'un des plus grands conglomérats d'énergie, de logistique et industriels d'Afrique de l'Est et centrale.",
    "Today, with <strong>4,600+ employees</strong> across 21 nationalities, 700+ trucks, 85+ fuel stations and 20+ subsidiaries, Lake Group powers everyday life across Tanzania, Kenya, Zambia, Rwanda, Burundi, DRC, Ethiopia and Mozambique.":
        "Aujourd'hui, avec plus de <strong>4 600 employés</strong> de 21 nationalités, plus de 700 camions, plus de 85 stations-service et plus de 20 filiales, Lake Group alimente la vie quotidienne en Tanzanie, au Kenya, en Zambie, au Rwanda, au Burundi, en RDC, en Éthiopie et au Mozambique.",
    "Trucks in Fleet": "Camions dans la flotte",
    "Top 5 petroleum distributor in Tanzania. Retail stations, bulk supply and storage across 8 countries.":
        "Top 5 des distributeurs de pétrole en Tanzanie. Stations-service, approvisionnement en vrac et stockage dans 8 pays.",
    "Lake Gas operates LPG bottling and distribution with cylinders for domestic and commercial use across 7 countries.":
        "Lake Gas exploite l'embouteillage et la distribution de GPL avec des bouteilles à usage domestique et commercial dans 7 pays.",
    "Lake Trans operates 700+ trucks for bulk liquid haulage and regional logistics across East & Central Africa.":
        "Lake Trans exploite plus de 700 camions pour le transport de liquides en vrac et la logistique régionale en Afrique de l'Est et centrale.",
    "GCCP, Dar es Salaam's leading ready-mix concrete supplier. 30,000 m³ aggregate monthly from our Lugoba quarry.":
        "GCCP, le principal fournisseur de béton prêt à l'emploi de Dar es Salaam. 30 000 m³ de granulats par mois depuis notre carrière de Lugoba.",
    "Lake Lubes manufactures and distributes high-quality automotive, industrial and marine lubricants in 5 countries.":
        "Lake Lubes fabrique et distribue des lubrifiants automobiles, industriels et marins de haute qualité dans 5 pays.",
    "Tanzania's first HS-CR rebar producer. Fully automated rolling mill, 100,000 MT/year capacity.":
        "Premier producteur de barres d'armature HS-CR en Tanzanie. Laminoir entièrement automatisé, capacité de 100 000 t/an.",
    "AFICD & ACFS provide inland container depot and freight station services across TZ, ZM and MZ.":
        "AFICD et ACFS fournissent des services de dépôt de conteneurs intérieur et de gare de fret en Tanzanie, en Zambie et au Mozambique.",
    "Operations across Tanzania, Kenya, Zambia, Rwanda, Burundi, DRC, Ethiopia, Mozambique & Dubai.":
        "Opérations en Tanzanie, au Kenya, en Zambie, au Rwanda, au Burundi, en RDC, en Éthiopie, au Mozambique et à Dubaï.",
    "See Lake Group in Action": "Voir Lake Group en action",
    "View Full Gallery": "Voir la galerie complète",
    "Message from the CEO": "Message du PDG",
    "\"Welcome to a diverse pioneer in fuel marketing, haulage, LPG bottling, cylinder manufacturing and concrete production. With experienced engineers and business professionals across our divisions, we are fully geared to meet the demands of the global marketplace.\"":
        "« Bienvenue chez un pionnier diversifié de la commercialisation de carburant, du transport, de l'embouteillage de GPL, de la fabrication de bouteilles et de la production de béton. Avec des ingénieurs expérimentés et des professionnels dans toutes nos divisions, nous sommes pleinement équipés pour répondre aux exigences du marché mondial. »",
    "CEO & Chairman, Lake Group \u00a0|\u00a0 Founded Lake Group at age 27 in 2006":
        "PDG et président, Lake Group \u00a0|\u00a0 A fondé Lake Group à 27 ans en 2006",
    # --- fuel.html ---
    "One of Tanzania's top 5 petroleum distributors, supplying quality fuel across 8 countries in East and Central Africa.":
        "L'un des 5 plus grands distributeurs de pétrole en Tanzanie, fournissant un carburant de qualité dans 8 pays d'Afrique de l'Est et centrale.",
    "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Retail fuel stations, 85+ across Tanzania and the region":
        "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Plus de 85 stations-service en Tanzanie et dans la région",
    "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Bulk petroleum supply for corporate and government clients":
        "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Approvisionnement en pétrole en vrac pour les clients corporatifs et gouvernementaux",
    "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Own oil storage facilities in Tanzania, Kenya, Burundi and DRC":
        "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Installations de stockage propres en Tanzanie, au Kenya, au Burundi et en RDC",
    "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Competitive pricing backed by regional supply chain scale":
        "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Tarifs compétitifs soutenus par l'envergure régionale de la chaîne d'approvisionnement",
    "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Quality products meeting national and international standards":
        "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Produits de qualité conformes aux normes nationales et internationales",
    "Wadi Elsundus Petroleum": "Wadi Elsundus Petroleum",
    "\ud83d\udccd Station Locator": "\ud83d\udccd Localisateur de stations",
    # --- services.html ---
    "Our Services & Divisions": "Nos services et divisions",
    "One Integrated Vision": "Une vision intégrée",
    "Lake Group operates across the full energy and industrial value chain of East and Central Africa.":
        "Lake Group est présent sur toute la chaîne de valeur énergétique et industrielle de l'Afrique de l'Est et centrale.",
    "Top 5 petroleum distributor in Tanzania. 85+ retail stations, bulk petroleum supply and storage.":
        "Top 5 des distributeurs de pétrole en Tanzanie. Plus de 85 stations-service, approvisionnement et stockage de pétrole en vrac.",
    "Lake Gas LPG bottling and distribution. 6kg, 10kg, 15kg and 38kg cylinders for domestic and commercial use across 7 countries.":
        "Embouteillage et distribution de GPL par Lake Gas. Bouteilles de 6 kg, 10 kg, 15 kg et 38 kg à usage domestique et commercial dans 7 pays.",
    "Lake Trans operates 700+ trucks for bulk liquid haulage and general cargo across East & Central Africa.":
        "Lake Trans exploite plus de 700 camions pour le transport de liquides en vrac et de marchandises générales en Afrique de l'Est et centrale.",
    "GCCP, Dar es Salaam's leading ready-mix concrete supplier. 30,000 m\u00b3 aggregate monthly.":
        "GCCP, le principal fournisseur de béton prêt à l'emploi de Dar es Salaam. 30 000 m³ de granulats par mois.",
    "Lake Lubes manufactures and distributes automotive, industrial and marine lubricants in 5 countries.":
        "Lake Lubes fabrique et distribue des lubrifiants automobiles, industriels et marins dans 5 pays.",
    "Tanzania's first HS-CR rebar producer. 100,000 MT/year rolling mill capacity.":
        "Premier producteur de barres d'armature HS-CR en Tanzanie. Capacité du laminoir de 100 000 t/an.",
    "AFICD & ACFS inland container depot and freight station services across TZ, ZM and MZ.":
        "Services de dépôt de conteneurs intérieur et de gare de fret AFICD et ACFS en Tanzanie, en Zambie et au Mozambique.",
    "Operations across 8 countries plus Dubai. Interactive map of all Lake Group facilities.":
        "Opérations dans 8 pays plus Dubaï. Carte interactive de toutes les installations de Lake Group.",
    "8 Countries + Dubai": "8 pays + Dubaï",
    "Explore the map \u2192": "Explorer la carte \u2192",
    # --- about.html ---
    "One of East and Central Africa's fastest growing energy trading and transportation conglomerates, founded 2006.":
        "L'un des conglomérats de négoce d'énergie et de transport à la croissance la plus rapide d'Afrique de l'Est et centrale, fondé en 2006.",
    "Lake Group was established by its founding CEO and Chairman <strong>Mr. Ally Edha Awadh</strong> in 2006 with the opening of its flagship company, Lake Oil: a humble beginning in Dar es Salaam, Tanzania.":
        "Lake Group a été fondé par son PDG et président <strong>M. Ally Edha Awadh</strong> en 2006 avec l'ouverture de sa société phare, Lake Oil : un début modeste à Dar es Salaam, en Tanzanie.",
    "Mr. Ally Edha Awadh": "M. Ally Edha Awadh",
    "Since inception, the growth story of Lake Group has been vertical, becoming one of the fastest-growing energy trading, logistics and construction supply material conglomerates in East and Central Africa and the Middle East.":
        "Depuis sa création, la croissance de Lake Group a été verticale, devenant l'un des conglomérats de négoce d'énergie, de logistique et de matériaux de construction à la croissance la plus rapide d'Afrique de l'Est et centrale et du Moyen-Orient.",
    "Today, Lake Group distributes petroleum products in 8 countries, owns storage facilities across the region, manufactures lubricants and ready-mix concrete, and operates a fleet of more than <strong>700 trucks</strong>.":
        "Aujourd'hui, Lake Group distribue des produits pétroliers dans 8 pays, possède des installations de stockage dans toute la région, fabrique des lubrifiants et du béton prêt à l'emploi, et exploite une flotte de plus de <strong>700 camions</strong>.",
    "With a diverse mix of <strong>21 nationalities</strong> and a total workforce of <strong>4,600+ employees</strong>, Lake Group continues to grow with purpose.":
        "Avec un mélange diversifié de <strong>21 nationalités</strong> et un effectif total de plus de <strong>4 600 employés</strong>, Lake Group continue de croître avec détermination.",
    "21 nationalities": "21 nationalités",
    "Our Full History": "Notre histoire complète",
    "To provide customers with quality products and services in a safe, efficient and cost-effective manner without damaging the environment, identifying and entering new areas of business while creating a work environment where employees exceed their personal best.":
        "Fournir aux clients des produits et services de qualité de manière sûre, efficace et économique sans nuire à l'environnement, en identifiant et en investissant de nouveaux secteurs d'activité tout en créant un environnement de travail où les employés dépassent leurs propres limites.",
    "Teamwork, Reliability, Integrity": "Esprit d'équipe, fiabilité, intégrité",
    "Where We're Going": "Où nous allons",
    "To become the leading regional convenience retailer and marketer of products and services while achieving continuous improvement through operational excellence, innovation and a culture based on performance.":
        "Devenir le principal détaillant et distributeur régional de produits et services de proximité, en assurant une amélioration continue grâce à l'excellence opérationnelle, à l'innovation et à une culture axée sur la performance.",
    "No compromise on quality": "Aucun compromis sur la qualité",
    "Safety is first always": "La sécurité passe toujours avant tout",
    "\"Welcome to a diverse pioneer in fuel marketing, haulage, LPG bottling, cylinder manufacturing and concrete production. With our experienced team across all business units, we are fully geared to meet the demands of the global marketplace.\"":
        "« Bienvenue chez un pionnier diversifié de la commercialisation de carburant, du transport, de l'embouteillage de GPL, de la fabrication de bouteilles et de la production de béton. Avec notre équipe expérimentée dans toutes nos unités d'affaires, nous sommes pleinement équipés pour répondre aux exigences du marché mondial. »",
    "Under Mr. Awadh's leadership, Lake Group has successfully established itself in Oil & Gas, Engineering, Industrial Supplies, Projects, Cargo, Distribution, General Trading, Storage, Concrete Solutions and the Construction Sector, building a high-credit-rated organisation over nearly two decades.":
        "Sous la direction de M. Awadh, Lake Group s'est solidement implanté dans le pétrole et le gaz, l'ingénierie, les fournitures industrielles, les projets, le fret, la distribution, le commerce général, le stockage, les solutions béton et le secteur de la construction, bâtissant une organisation hautement solvable depuis près de deux décennies.",
    # --- contact.html ---
    "Reach our team for enquiries, partnerships, quotes or any information about Lake Group and its subsidiaries.":
        "Contactez notre équipe pour toute demande, partenariat, devis ou information sur Lake Group et ses filiales.",
    "We're Happy to Hear From You": "Nous sommes heureux de vous entendre",
    "Plot 49, Mikocheni Light Industrial Area": "Plot 49, Mikocheni Light Industrial Area",
    "P.O.BOX 5055, Dar es Salaam, Tanzania": "B.P. 5055, Dar es Salaam, Tanzanie",
    "Monday \u2013 Friday": "Lundi - Vendredi",
    "9:00 AM \u2013 6:00 PM EAT": "9h00 - 18h00 (heure de l'Afrique de l'Est)",
    "Mikocheni, Dar es Salaam, Tanzania": "Mikocheni, Dar es Salaam, Tanzanie",
    "Coordinates: -6.762806, 39.241447": "Coordonnées : -6,762806, 39,241447",
    "Open in Google Maps": "Ouvrir dans Google Maps",
    "your@email.com": "votre@email.com",
    "Tell us what you need...": "Indiquez-nous vos besoins...",
}

TERMS_PT = {
    "Fuel & Petroleum Distribution": "Distribuição de combustível e petróleo",
    "Fuel & Petroleum": "Combustível e petróleo",
    "Transport & Haulage": "Transporte e logística",
    "Concrete & Aggregate": "Betão e agregados",
    "CSR & Sustainability": "RSC e sustentabilidade",
    "Container Services": "Serviços de contentores",
    "Africa Operations Map": "Mapa de operações em África",
    "Station Locator": "Localizador de postos",
    "Our Fleet": "A nossa frota",
    "Our History": "A nossa história",
    "Investor Relations": "Relações com investidores",
    "Major Projects": "Grandes projetos",
    "Track Shipment": "Rastrear envio",
    "Get a Quote": "Pedir orçamento",
    "About Us": "Sobre nós",
    "Quality, Service, Safety, Professionalism": "Qualidade, serviço, segurança, profissionalismo",
    "All rights reserved.": "Todos os direitos reservados.",
    "Lake Group Assistant": "Assistente Lake Group",
    "Ask us anything": "Pergunte-nos qualquer coisa",
    "Hello! How can I help you today?": "Olá! Como posso ajudar hoje?",
    "Type a message...": "Escreva uma mensagem...",
    "Keeping Africa Moving": "Mantendo África em movimento",
    "Operations by Country": "Operações por país",
    "Quick Links": "Links rápidos",
    "Why Choose Lake Oil": "Porque escolher a Lake Oil",
    "Our Competitive Edge": "A nossa vantagem competitiva",
    "Top 5 in Tanzania": "Top 5 na Tanzânia",
    "Ranked among the top 5 petroleum distributors in Tanzania by volume.": "Classificada entre os 5 maiores distribuidores de petróleo na Tanzânia por volume.",
    "Own Storage": "Armazenamento próprio",
    "Strategic storage facilities in Tanzania, Kenya, Burundi and DRC.": "Instalações de armazenamento estratégicas na Tanzânia, Quénia, Burundi e RDC.",
    "700+ Trucks": "Mais de 700 camiões",
    "Integrated logistics fleet for reliable, on-time delivery every time.": "Frota logística integrada para entregas fiáveis e pontuais sempre.",
    "8 Countries": "8 países",
    "Pan-African fuel supply capability across East and Central Africa.": "Capacidade de fornecimento de combustível pan-africana na África Oriental e Central.",
    "Request Fuel Supply Quote": "Pedir orçamento de fornecimento de combustível",
    "Find a Station": "Encontrar um posto",
    "Track Delivery": "Rastrear entrega",
    "Energy": "Energia", "Industry": "Indústria", "Logistics": "Logística",
    "Services": "Serviços", "Network": "Rede", "Company": "Empresa",
    "News": "Notícias", "Careers": "Carreiras", "Contact": "Contacto",
    "About": "Sobre", "Home": "Início", "Gallery": "Galeria",
    "Leadership": "Liderança", "History": "História", "Investors": "Investidores",
    "Projects": "Projetos", "More": "Mais", "Privacy": "Privacidade", "Terms": "Termos",
    "Send": "Enviar", "View": "Ver", "Apply": "Candidatar-se", "Review": "Rever",
    "Date": "Data", "Status": "Estado", "Phone": "Telefone", "Email": "E-mail",
    "Today": "Hoje", "Other": "Outro", "Account": "Conta", "Sign In": "Iniciar sessão",
    "Service": "Serviço", "Product": "Produto", "Origin": "Origem",
    "Employees": "Funcionários", "Trucks": "Camiões", "Fuel Stations": "Postos de combustível",
    "Countries": "Países", "Subsidiaries": "Subsidiárias", "Subsidiary": "Subsidiária",
    "Delivered": "Entregue", "In Transit": "Em trânsito", "Open Now": "Aberto agora",
    "Learn more →": "Saber mais →",
    "Lake Steel": "Lake Steel", "LPG Gas": "Gás GLP", "Lubricants": "Lubrificantes",
    "Tanzania": "Tanzânia", "Kenya": "Quénia", "Zambia": "Zâmbia", "Rwanda": "Ruanda",
    "Burundi": "Burundi", "DRC": "RDC", "Ethiopia": "Etiópia", "Mozambique": "Moçambique",
    "Dubai": "Dubai",
    "Services ▾": "Serviços ▾", "Network ▾": "Rede ▾", "Company ▾": "Empresa ▾",
    "Fuel": "Combustível", "Steel": "Aço", "Concrete": "Betão", "Transport": "Transporte",
    "Containers": "Contentores", "Africa Map": "Mapa África", "CSR": "RSC",
    "Track": "Rastrear",
    # --- Expanded coverage ---
    "About Lake Group": "Sobre o Lake Group",
    "Our Company": "A nossa empresa",
    "Company Profile": "Perfil da empresa",
    "Company Overview": "Visão geral da empresa",
    "Company News": "Notícias da empresa",
    "Latest News": "Últimas notícias",
    "Latest Stories": "Últimas histórias",
    "Latest Announcements": "Últimos anúncios",
    "News & Events": "Notícias e eventos",
    "Press Release": "Comunicado de imprensa",
    "All topics": "Todos os tópicos",
    "All countries": "Todos os países",
    "All services": "Todos os serviços",
    "All (39)": "Todos (39)",
    "Filter by service": "Filtrar por serviço",
    "Search news...": "Pesquisar notícias...",
    "Display currency:": "Moeda de exibição:",
    "Headquarters": "Sede",
    "Group Leadership": "Liderança do grupo",
    "Leadership Team": "Equipa de liderança",
    "Full Leadership Team": "Equipa de liderança completa",
    "Group CEO & Chairman": "CEO e presidente do grupo",
    "CEO & Chairman": "CEO e presidente",
    "CEO Message": "Mensagem do CEO",
    "Executive Director · Lake Group": "Diretor executivo · Lake Group",
    "Human Resources Director · Lake Oil": "Diretora de recursos humanos · Lake Oil",
    "Finance Manager": "Diretor financeiro",
    "Civil Engineer": "Engenheiro civil",
    "HR / Admin": "RH / Administração",
    "Group & Lake Oil Management": "Direção do grupo e da Lake Oil",
    "Business Units": "Unidades de negócio",
    "Companies Under Lake Group": "Empresas do grupo Lake Group",
    "A Word from Our Founder": "Uma palavra do nosso fundador",
    "A Conglomerate Built on Grit and Vision": "Um conglomerado construído com determinação e visão",
    "Founded Lake Group at age 27 in 2006": "Fundou o Lake Group aos 27 anos em 2006",
    "From a Single Fuel Company to a Regional Powerhouse": "De uma única empresa de combustíveis a uma potência regional",
    "From 1 company in 2006 to 20+ subsidiaries, a track record of disciplined expansion and value creation over 18 years.":
        "De 1 empresa em 2006 para mais de 20 subsidiárias: um historial de expansão disciplinada e criação de valor ao longo de 18 anos.",
    "From a single fuel station to a pan-African conglomerate, the journey of Lake Group since 2006.":
        "De um único posto de combustível a um conglomerado pan-africano: a jornada do Lake Group desde 2006.",
    "18 Years of Growth": "18 anos de crescimento",
    "A Track Record of Vertical Growth": "Um historial de crescimento vertical",
    "Building East Africa's Future": "Construindo o futuro da África Oriental",
    "Be Part of the Next Chapter": "Faça parte do próximo capítulo",
    "Join Our Team": "Junte-se à nossa equipa",
    "Join the Team": "Junte-se à equipa",
    "Explore Careers": "Explorar carreiras",
    "Careers at Lake Group": "Carreiras no Lake Group",
    "Apply Now": "Candidatar-se agora",
    "General Application": "Candidatura espontânea",
    "Drop Us Your CV": "Envie-nos o seu CV",
    "Career Growth": "Crescimento de carreira",
    "Diverse Teams": "Equipas diversificadas",
    "A culture we cherish": "Uma cultura que valorizamos",
    "Build Your Career Across Africa": "Construa a sua carreira em toda a África",
    "Cross-country and cross-division advancement opportunities": "Oportunidades de progressão entre países e divisões",
    "Even if no specific role matches your profile, we welcome speculative applications from talented professionals.":
        "Mesmo que nenhuma vaga específica corresponda ao seu perfil, aceitamos candidaturas espontâneas de profissionais talentosos.",
    "Education": "Educação",
    "Education & Skills": "Educação e competências",
    "Health & Safety": "Saúde e segurança",
    "Environment": "Ambiente",
    "Environmental Initiatives": "Iniciativas ambientais",
    "Environmental Stewardship": "Gestão ambiental",
    "Corporate Responsibility": "Responsabilidade corporativa",
    "CSR & Community": "RSC e comunidade",
    "How We Give Back": "Como retribuímos",
    "Food Security": "Segurança alimentar",
    "Community Infrastructure": "Infraestrutura comunitária",
    "Clean Cooking Transition": "Transição para cozinha limpa",
    "Clean Energy for Every Kitchen": "Energia limpa para cada cozinha",
    "Active corporate social responsibility across all markets, building brand equity, local goodwill and sustainable business relationships.":
        "Responsabilidade social corporativa ativa em todos os mercados, construindo valor de marca, boa vontade local e relações comerciais sustentáveis.",
    "As a major energy and logistics company operating across 8 countries, Lake Group recognises its responsibility to operate in a manner that minimises environmental impact and contributes to sustainable development across Africa.":
        "Como uma grande empresa de energia e logística presente em 8 países, o Lake Group reconhece a sua responsabilidade de operar de forma a minimizar o impacto ambiental e contribuir para o desenvolvimento sustentável em África.",
    "As one of East Africa's largest private employers, Lake Group takes its social and environmental responsibilities seriously. The Group regularly provides support to community development through many of its CSR activities and is one of the leaders among its peers.":
        "Como um dos maiores empregadores privados da África Oriental, o Lake Group leva muito a sério as suas responsabilidades sociais e ambientais. O Grupo apoia regularmente o desenvolvimento comunitário através de muitas das suas atividades de RSC e é um dos líderes entre os seus pares.",
    "Contributing to the construction and renovation of community facilities, roads, water points, health clinics and public amenities in operational areas.":
        "Contribuindo para a construção e renovação de instalações comunitárias, estradas, pontos de água, clínicas de saúde e equipamentos públicos nas áreas operacionais.",
    "Industry-leading safety standards across all divisions. Zero-harm ambition for employees, contractors and the communities we operate in.":
        "Normas de segurança líderes do setor em todas as divisões. Ambição de zero danos para colaboradores, subcontratados e comunidades onde operamos.",
    "Industry-leading safety standards in all operations": "Normas de segurança líderes do setor em todas as operações",
    "Lake Group is committed to giving back to the communities it serves and operating with minimal environmental impact.":
        "O Lake Group está empenhado em retribuir às comunidades que serve e em operar com o mínimo impacto ambiental.",
    "Lake Group's commitment to environmental responsibility, clean energy transition and reducing our operational footprint.":
        "O compromisso do Lake Group com a responsabilidade ambiental, a transição para energia limpa e a redução da nossa pegada operacional.",
    "Investor Enquiries": "Pedidos de investidores",
    "For Investors": "Para investidores",
    "Financial highlights, company growth profile and governance information for current and prospective investors.":
        "Destaques financeiros, perfil de crescimento da empresa e informações de governação para investidores atuais e potenciais.",
    "Contact our corporate team for further information on the Group's financial profile and partnership opportunities.":
        "Contacte a nossa equipa corporativa para mais informações sobre o perfil financeiro do Grupo e oportunidades de parceria.",
    "Interested in Investing or Partnering with Lake Group?": "Interessado em investir ou estabelecer parceria com o Lake Group?",
    "Diversified Revenue": "Receita diversificada",
    "Customer Satisfaction": "Satisfação do cliente",
    "Fleet Efficiency": "Eficiência da frota",
    "Fleet Statistics": "Estatísticas da frota",
    "Fleet Categories": "Categorias da frota",
    "Impact Numbers": "Números de impacto",
    "Growth Pillars": "Pilares de crescimento",
    "Guided by Experience. Driven by Vision.": "Guiados pela experiência. Impulsionados pela visão.",
    "Each subsidiary is led by sector specialists in oil & gas, logistics, engineering, manufacturing and port services.":
        "Cada subsidiária é liderada por especialistas setoriais em petróleo e gás, logística, engenharia, fabrico e serviços portuários.",
    "Eight Sectors": "Oito setores",
    "Eight Sectors. One Vision.": "Oito setores. Uma só visão.",
    "Eight distinct business lines across energy, logistics, manufacturing and construction reduce single-sector risk and provide stable multi-stream revenue.":
        "Oito linhas de negócio distintas em energia, logística, fabrico e construção reduzem o risco de um único setor e garantem receitas estáveis e diversificadas.",
    "From fuel stations to steel mills, eight sectors, one vision, across eight countries.":
        "Dos postos de combustível às siderúrgicas: oito setores, uma só visão, em oito países.",
    "Fuel depots, LPG terminals, truck fleets, container depots and concrete plants, all connected through our Africa network.":
        "Depósitos de combustível, terminais de GLP, frotas de camiões, depósitos de contentores e centrais de betão, todos ligados através da nossa rede africana.",
    "Energy for Africa. Responsibly.": "Energia para África. Com responsabilidade.",
    "Delivering East Africa's Development": "Ao serviço do desenvolvimento da África Oriental",
    "Engineered for Performance": "Concebido para o desempenho",
    "First in Tanzania. Built to Last.": "Primeira na Tanzânia. Feita para durar.",
    "Fastest Growing Company in Africa": "Empresa que mais cresce em África",
    "Highest Service Standards": "Normas de serviço mais elevadas",
    "Highest service standards and consistent supply of fuel and customer care in every territory.":
        "As normas de serviço mais elevadas e um fornecimento constante de combustível e atendimento ao cliente em cada território.",
    "Guided by our core values: <strong style=\"color:var(--yellow)\">Teamwork, Reliability, Integrity</strong> and <strong style=\"color:var(--yellow)\">Customer Satisfaction</strong>.":
        "Guiados pelos nossos valores fundamentais: <strong style=\"color:var(--yellow)\">trabalho de equipa, fiabilidade, integridade</strong> e <strong style=\"color:var(--yellow)\">satisfação do cliente</strong>.",
    "Committed to excellence": "Comprometidos com a excelência",
    "Field Operations": "Operações no terreno",
    "Field Operations across East Africa": "Operações no terreno em toda a África Oriental",
    "Country Operations": "Operações por país",
    "African Countries": "Países africanos",
    "And expanding": "E em expansão",
    "Available in 5 Countries": "Disponível em 5 países",
    "Countries with clean LPG access via Lake Gas": "Países com acesso a GLP limpo através da Lake Gas",
    "Find your nearest Lake Oil station by city or region.": "Encontre o seu posto Lake Oil mais próximo por cidade ou região.",
    "Find a Fuel Station": "Encontrar um posto de combustível",
    "City, Region, Country": "Cidade, região, país",
    "Convenience Store": "Loja de conveniência",
    "Border Crossing": "Passagem de fronteira",
    "By Tracking ID": "Por número de rastreio",
    "By Truck Number": "Por número de camião",
    "Enter your tracking ID or truck number to view real-time delivery status and estimated arrival.":
        "Introduza o seu número de rastreio ou de camião para ver o estado da entrega em tempo real e a hora de chegada estimada.",
    "Est. Arrival": "Chegada estimada",
    "Delivery Progress": "Progresso da entrega",
    "Delivery Location": "Local de entrega",
    "Destination": "Destino",
    "For urgent shipment queries, contact our logistics team directly.": "Para questões urgentes sobre envios, contacte diretamente a nossa equipa de logística.",
    "Have a major project that needs energy, logistics or construction supply support?":
        "Tem um grande projeto que precisa de apoio em energia, logística ou fornecimento para construção?",
    "Discuss Your Project": "Discuta o seu projeto",
    "From multi-million dollar construction projects to long-haul logistics contracts, Lake Group has the scale, expertise and equipment to deliver.":
        "De projetos de construção multimilionários a contratos de logística de longa distância, o Lake Group tem a escala, a experiência e os equipamentos para entregar.",
    "Completed": "Concluído",
    "Completed (YTD)": "Concluído (acumulado anual)",
    "Infrastructure": "Infraestrutura",
    "Infrastructure Layers": "Camadas de infraestrutura",
    "Infrastructure Ownership": "Propriedade da infraestrutura",
    "Business": "Negócios",
    "For press releases, interviews or media partnerships:": "Para comunicados de imprensa, entrevistas ou parcerias com os media:",
    "For interview requests, press enquiries or media partnerships, please contact our communications team.":
        "Para pedidos de entrevista, questões de imprensa ou parcerias com os media, contacte a nossa equipa de comunicação.",
    "Email Media Team": "Contactar a equipa de media",
    "Documents": "Documentos",
    "Download": "Descarregar",
    "Download PDF": "Descarregar PDF",
    "Article": "Artigo",
    "Get in Touch": "Entre em contacto",
    "Contact Us": "Contacte-nos",
    "Contact Lake Group": "Contactar o Lake Group",
    "Contact GCCP": "Contactar a GCCP",
    "Contact Sales": "Contactar vendas",
    "Contact Steel Sales": "Contactar vendas de aço",
    "Contact Information": "Informações de contacto",
    "How can we help?": "Como podemos ajudar?",
    "Enquiry Form": "Formulário de pedido",
    "Cover Message": "Mensagem de apresentação",
    "Full Name *": "Nome completo *",
    "Email *": "E-mail *",
    "Email Address": "Endereço de e-mail",
    "Email Address *": "Endereço de e-mail *",
    "Company / Organisation": "Empresa / Organização",
    "Company name": "Nome da empresa",
    "Describe your requirements, timeline, and any special specifications...":
        "Descreva os seus requisitos, prazos e quaisquer especificações especiais...",
    "I consent to Lake Group processing my enquiry data and contacting me with a response.":
        "Aceito que o Lake Group processe os dados do meu pedido e me contacte com uma resposta.",
    "Immediate acknowledgement by email": "Confirmação imediata por e-mail",
    "Fast-track setup for new corporate clients": "Configuração acelerada para novos clientes corporativos",
    "Custom quote delivered": "Orçamento personalizado entregue",
    "Finalise & onboard": "Finalizar e integrar",
    "Estimated Volume / Quantity": "Volume / quantidade estimado",
    "Project Details & Requirements *": "Detalhes e requisitos do projeto *",
    "Fuel & Petroleum Supply": "Fornecimento de combustível e petróleo",
    "Request a Quote": "Pedir um orçamento",
    "Corporate clients only. Contact us for access.": "Apenas clientes corporativos. Contacte-nos para obter acesso.",
    "Client Dashboard": "Painel do cliente",
    "Corporate Portal": "Portal corporativo",
    "Corporate Client": "Cliente corporativo",
    "Account Details": "Detalhes da conta",
    "Active Orders": "Encomendas ativas",
    "Here's your account summary for December 2024": "Aqui está o resumo da sua conta de dezembro de 2024",
    "Last update:": "Última atualização:",
    "Thank you for your message. Email admin@lakeoilgroup.com or call +255 222780510. Mon\u2013Fri 9:00\u201318:00.":
        "Obrigado pela sua mensagem. Envie um e-mail para admin@lakeoilgroup.com ou ligue para +255 222780510. Seg-Sex 9h00-18h00.",
    "Lake Oil supplies petroleum products across Tanzania, Kenya, Zambia, DRC, Rwanda, Burundi & Ethiopia. Contact admin@lakeoilgroup.com for pricing.":
        "A Lake Oil fornece produtos petrolíferos na Tanzânia, Quénia, Zâmbia, RDC, Ruanda, Burundi e Etiópia. Contacte admin@lakeoilgroup.com para preços.",
    "Lake Gas offers 6kg, 10kg, 15kg and 38kg cylinders for domestic and commercial use. Available in 7 countries across East & Central Africa.":
        "A Lake Gas oferece cilindros de 6kg, 10kg, 15kg e 38kg para uso doméstico e comercial. Disponível em 7 países da África Oriental e Central.",
    "Lake Trans operates a fleet of 700+ trucks across East & Central Africa for bulk liquid haulage and general cargo.":
        "A Lake Trans opera uma frota de mais de 700 camiões na África Oriental e Central para transporte de líquidos a granel e carga geral.",
    "Our headquarters: Plot 49, Mikocheni Light Industrial Area, Dar es Salaam. Tel: +255 222780510 | Email: admin@lakeoilgroup.com":
        "A nossa sede: Plot 49, Mikocheni Light Industrial Area, Dar es Salaam. Tel: +255 222780510 | E-mail: admin@lakeoilgroup.com",
    "Visit our Station Locator page to find the nearest Lake Oil fuel station. We have 85+ stations across Tanzania and the region.":
        "Visite a nossa página de Localizador de Postos para encontrar o posto Lake Oil mais próximo. Temos mais de 85 postos na Tanzânia e na região.",
    "We're always looking for talented people. Visit our Careers page to explore opportunities across our 20+ subsidiaries.":
        "Estamos sempre à procura de pessoas talentosas. Visite a nossa página de Carreiras para explorar oportunidades nas nossas mais de 20 subsidiárias.",
    "Lake Steel is the first company in Tanzania to introduce High Strength Corrosion Resistant (HS-CR) rebars with 100,000 MT annual capacity.":
        "A Lake Steel é a primeira empresa na Tanzânia a introduzir varões de alta resistência e resistentes à corrosão (HS-CR), com capacidade anual de 100.000 toneladas.",
    "GCCP (Gulf Concrete & Cement Products) is Dar es Salaam's leading ready-mix concrete supplier, established 2010.":
        "A GCCP (Gulf Concrete & Cement Products) é o principal fornecedor de betão pronto de Dar es Salaam, fundada em 2010.",
    "Hello! Welcome to Lake Group. How can I help you today?":
        "Olá! Bem-vindo ao Lake Group. Como posso ajudar hoje?",
    "Hi there! I'm the Lake Group assistant. Ask me about our services, locations, or how to get in touch.":
        "Olá! Sou o assistente do Lake Group. Pergunte-me sobre os nossos serviços, localizações ou como entrar em contacto.",
    # --- Container, fleet, concrete spec checkmarks ---
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>2 boom pumps (32m boom length)":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>2 bombas de lança (lança de 32 m)",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>2x Aggregate crushing plants (250T/hr each)":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>2 instalações de britagem de agregados (250 t/h cada)",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>2x Sany International fully-automatic batching plants":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>2 centrais de betão totalmente automáticas Sany International",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>4 stationary concrete pumps (Sany International)":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>4 bombas de betão estacionárias (Sany International)",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>Container repair and maintenance":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>Reparação e manutenção de contentores",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>Container storage and stacking":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>Armazenamento e empilhamento de contentores",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>Container stuffing and de-stuffing (LCL/FCL)":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>Enchimento e esvaziamento de contentores (LCL/FCL)",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>Customs examination and clearance support":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>Apoio à inspeção e desalfandegamento",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>Integration with Lake Trans trucking network":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>Integração com a rede de transporte da Lake Trans",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>Own quarry at Lugoba, Tanzania":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>Pedreira própria em Lugoba, Tanzânia",
    "<span style=\"color:var(--amber);font-weight:700\">✓</span>Reefer (refrigerated) container handling":
        "<span style=\"color:var(--amber);font-weight:700\">✓</span>Manuseamento de contentores refrigerados",
    "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Bulk petroleum and liquid haulage":
        "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Transporte de petróleo e líquidos a granel",
    "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Cross-border regional transport":
        "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Transporte regional transfronteiriço",
    "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Dry cargo and containerised freight":
        "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Carga seca e frete em contentores",
    "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Experienced drivers and route managers":
        "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Motoristas experientes e gestores de rotas",
    "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Real-time fleet tracking capability":
        "<span style=\"color:var(--amber);font-weight:700;flex-shrink:0\">✓</span>Capacidade de rastreio da frota em tempo real",
    # --- Stats / numbers with units ---
    "+ Cross-border corridors": "+ Corredores transfronteiriços",
    "1 subsidiary (MERM)": "1 subsidiária (MERM)",
    "10 Kg Composite Cylinder <span class=\"badge badge-amber\" style=\"margin-left:8px\">New</span>":
        "Cilindro composto de 10 kg <span class=\"badge badge-amber\" style=\"margin-left:8px\">Novo</span>",
    "100,000 metric tonnes": "100.000 toneladas métricas",
    "12m³ capacity": "Capacidade de 12 m³",
    "15 Kg Cylinder": "Cilindro de 15 kg",
    "20ft & 40ft": "20 e 40 pés",
    "21 Nationalities. One Team.": "21 nacionalidades. Uma só equipa.",
    "25 tonnes per hour": "25 toneladas por hora",
    "30–60k litres": "30.000 a 60.000 litros",
    "38 Kg Cylinder": "Cilindro de 38 kg",
    "39 real photos": "39 fotografias reais",
    "4,000+ Employees Milestone": "Marca de mais de 4.000 colaboradores",
    "4,600+ Employees. 8 Countries. Still Growing.": "Mais de 4.600 colaboradores. 8 países. Ainda a crescer.",
    "6 Kg Cylinder": "Cilindro de 6 kg",
    "8 Countries, 4,600+ Employees": "8 países, mais de 4.600 colaboradores",
    "85+ Stations Across Tanzania": "Mais de 85 postos na Tanzânia",
    "<strong>39 real photos</strong> from Lake Group operations, GCCP, MERM Dubai, Lake Gas, Lake Oil & more.":
        "<strong>39 fotografias reais</strong> das operações do Lake Group, GCCP, MERM Dubai, Lake Gas, Lake Oil e mais.",
    "<strong>Account #:</strong> LG-CORP-4821": "<strong>N.º de conta:</strong> LG-CORP-4821",
    "<strong>Account Manager:</strong> Dar es Salaam Office": "<strong>Gestor de conta:</strong> Escritório de Dar es Salaam",
    "<strong>Company:</strong> Demo Corporation Ltd.": "<strong>Empresa:</strong> Demo Corporation Ltd.",
    "<strong>Credit Limit:</strong> USD 250,000": "<strong>Limite de crédito:</strong> 250.000 USD",
    "<strong>Last update:</strong> Truck T-4821 checked into Tunduma border crossing at 09:45. On schedule for delivery.":
        "<strong>Última atualização:</strong> O camião T-4821 passou pela fronteira de Tunduma às 09h45. Entrega dentro do previsto.",
    "@lakeoilltd on Instagram": "@lakeoilltd no Instagram",
    "A showcase of landmark construction, infrastructure and supply projects delivered by Lake Group across East Africa.":
        "Uma vitrine de projetos marcantes de construção, infraestrutura e fornecimento realizados pelo Lake Group na África Oriental.",
    "A story of bold decisions, relentless expansion, and building an energy empire from the ground up.":
        "Uma história de decisões audaciosas, expansão incessante e construção de um império energético a partir do zero.",
    "ACFS: Container Freight Station": "ACFS: Estação de Frete de Contentores",
    "AFICD": "AFICD",
    "AFICD & ACFS": "AFICD e ACFS",
    "AFICD (African Inland Container Depot) and ACFS (African Container Freight Station) are Lake Group's port logistics arms, providing critical container storage, handling and customs services that extend port capacity into the hinterland.":
        "AFICD (African Inland Container Depot) e ACFS (African Container Freight Station) são os braços de logística portuária do Lake Group, fornecendo serviços essenciais de armazenamento, manuseamento e desalfandegamento de contentores que estendem a capacidade portuária até ao interior.",
    "AFICD (African Inland Container Depot) is launched in Tanzania and Zambia. MERM (Middle East Ready Mix LLC) is established in Dubai, marking the Group's first presence outside Africa.":
        "A AFICD (African Inland Container Depot) é lançada na Tanzânia e na Zâmbia. A MERM (Middle East Ready Mix LLC) é estabelecida em Dubai, marcando a primeira presença do Grupo fora de África.",
    "AFICD + ACFS": "AFICD + ACFS",
    "AFICD operates strategic inland container depots in Tanzania, Zambia and Mozambique, extending port capacity into the hinterland and enabling efficient cross-border trade.":
        "A AFICD opera depósitos de contentores interiores estratégicos na Tanzânia, Zâmbia e Moçambique, estendendo a capacidade portuária até ao interior e permitindo um comércio transfronteiriço eficiente.",
    "AFICD: African Inland Container Depot": "AFICD: Depósito Interior de Contentores Africano",
    "Abdulrahman Mohamed": "Abdulrahman Mohamed",
    "Account Manager:": "Gestor de conta:",
    "Africa Operations Network": "Rede de Operações em África",
    "African Inland Container Depot (AFICD)": "Depósito Interior de Contentores Africano (AFICD)",
    "African Inland Container Depot (AFICD) and Container Freight Station (ACFS), port extension solutions across East Africa.":
        "Depósito Interior de Contentores Africano (AFICD) e Estação de Frete de Contentores (ACFS), soluções de extensão portuária na África Oriental.",
    "African Inland Container Depot Network": "Rede de Depósitos Interiores de Contentores Africanos",
    "After-Sales Services": "Serviços pós-venda",
    "Aggregate Plant Cap.": "Capacidade da instalação de agregados",
    "Agricultural and greenfield project development. Projects Manager: Nassoro Abubakari":
        "Desenvolvimento de projetos agrícolas e de novos terrenos. Gestor de Projetos: Nassoro Abubakari",
    "All petroleum transport operations are governed by strict zero-tolerance spillage protocols. Our tanker fleet is regularly inspected and certified.":
        "Todas as operações de transporte de petróleo são regidas por protocolos estritos de tolerância zero a derrames. A nossa frota de camiões-cisterna é regularmente inspecionada e certificada.",
    "Ally Edha Awadh": "Ally Edha Awadh",
    "Ally Edha Awadh founds Lake Oil Ltd. at age 27 in Dar es Salaam, Tanzania, the seed of what would become Lake Group. Begins petroleum distribution with a small fleet.":
        "Ally Edha Awadh funda a Lake Oil Ltd. aos 27 anos em Dar es Salaam, Tanzânia, a semente do que se tornaria o Lake Group. Inicia a distribuição de petróleo com uma pequena frota.",
    "Architectural Concrete": "Betão arquitetónico",
    "Arusha Town Centre, Arusha": "Centro da cidade de Arusha, Arusha",
    "Automotive Lubricants": "Lubrificantes automóveis",
    "Billets heated to rolling temperature in our furnace.": "Tarugos aquecidos à temperatura de laminagem no nosso forno.",
    "Billets tested in our lab. Only approved materials proceed.": "Tarugos testados no nosso laboratório. Apenas materiais aprovados avançam.",
    "Brackish groundwater": "Águas subterrâneas salobras",
    "Burundi Petroleum Ltd.": "Burundi Petroleum Ltd.",
    "Composite LPG Cylinders Launched": "Lançamento de cilindros de GLP compostos",
    "Computerised rolling at 25T/hr capacity.": "Laminagem informatizada com capacidade de 25 t/h.",
    "Concrete Mixer Trucks": "Camiões-betoneira",
    "Concrete, 600m³": "Betão, 600 m³",
    "Container & Depot Services": "Serviços de contentores e depósito",
    "Container Depot & Dubai Expansion": "Depósito de contentores e expansão para Dubai",
    "Container Depot Services": "Serviços de depósito de contentores",
    "Container Handlers": "Movimentadores de contentores",
    "Contract Renewal, Pending Signature": "Renovação de contrato, pendente de assinatura",
    "Country borders shown in white · Lake Group nations in gold · Colored dots = infrastructure":
        "Fronteiras dos países em branco · Países do Lake Group em dourado · Pontos coloridos = infraestrutura",
    "Crack-Resistant Concrete": "Betão resistente a fissuras",
    # --- Batch 2: history, LPG, MERM, steel, careers, contact, tracking ---
    "\"With a team of experienced engineers and business professionals across our units, Lake Group is fully geared to meet the demands of the global marketplace, from fuel marketing and haulage to LPG, steel, lubricants and concrete.\"":
        "\"Com uma equipa de engenheiros experientes e profissionais de negócios em todas as nossas unidades, o Lake Group está totalmente preparado para responder às exigências do mercado global, desde a comercialização de combustíveis e transporte até GLP, aço, lubrificantes e betão.\"",
    "(indicative, <span id=\"currency-label\">USD</span>)": "(indicativo, <span id=\"currency-label\">USD</span>)",
    "DRC & Ethiopia Entry": "Entrada na RDC e Etiópia",
    "DRC Petroleum Ltd.": "DRC Petroleum Ltd.",
    "DRC Petroleum Ltd. and Wadi Elsundus Petroleum Co. (Ethiopia) are established, bringing the Group's operational footprint to 7 countries.":
        "São criadas a DRC Petroleum Ltd. e a Wadi Elsundus Petroleum Co. (Etiópia), elevando a presença operacional do Grupo para 7 países.",
    "Dar es Salaam": "Dar es Salaam",
    "Dar es Salaam, gateway to East Africa's largest economy": "Dar es Salaam, porta de entrada para a maior economia da África Oriental",
    "Dedicated LPG transport vehicles for safe cylinder and bulk gas delivery across East Africa.":
        "Veículos dedicados ao transporte de GLP para entrega segura de cilindros e gás a granel na África Oriental.",
    "Delivery Note, LG-2024-8847": "Nota de entrega, LG-2024-8847",
    "Dodoma City Centre, Dodoma": "Centro da cidade de Dodoma, Dodoma",
    "Due: Jan 5, 2025": "Prazo: 5 de janeiro de 2025",
    "East Africa Construction Expo": "Feira de Construção da África Oriental",
    "Engine oils, transmission fluids and greases for passenger and commercial vehicles.":
        "Óleos de motor, fluidos de transmissão e graxas para veículos de passageiros e comerciais.",
    "Est. group revenue:": "Receita estimada do grupo:",
    "Facebook": "Facebook",
    "Fire Resistance": "Resistência ao fogo",
    "Flagship petroleum importer, depot operator and retail network, Tanzania's top fuel distributors. MD: Abdulrahman Mohamed":
        "Importador principal de petróleo, operador de depósitos e rede de retalho, entre os maiores distribuidores de combustível da Tanzânia. Diretor-Geral: Abdulrahman Mohamed",
    "Flows and consolidates under its own weight, ideal for congested reinforcement.":
        "Flui e consolida sob o seu próprio peso, ideal para armaduras densas.",
    "For projects requiring fast formwork removal and accelerated construction schedules.":
        "Para projetos que exigem remoção rápida de cofragem e prazos de construção acelerados.",
    "Founded and led by Ally Edha Awadh: an experienced entrepreneur who has built a high-credit-rated organisation over nearly two decades.":
        "Fundado e liderado por Ally Edha Awadh: um empresário experiente que construiu uma organização com elevada classificação de crédito durante quase duas décadas.",
    "Founder of Lake Group (2006) · Forbes-recognised entrepreneur · Young Business Leader of the Year, African Leadership Magazine 2022":
        "Fundador do Lake Group (2006) · Empresário reconhecido pela Forbes · Jovem Líder Empresarial do Ano, African Leadership Magazine 2022",
    "From Billets to Bars": "De tarugos a varões",
    "From petroleum tankers to dry cargo, our transport division ensures timely, safe and cost-effective delivery to destinations across Tanzania, Kenya and Zambia, and throughout the wider region.":
        "De camiões-cisterna a carga seca, a nossa divisão de transporte garante entregas pontuais, seguras e económicas para destinos na Tanzânia, Quénia e Zâmbia, e em toda a região.",
    "Fuel & Logistics": "Combustível e logística",
    "Fuel & Oil (5)": "Combustível e petróleo (5)",
    "Fuel Distribution Network": "Rede de distribuição de combustível",
    "GCCP Co. Ltd.": "GCCP Co. Ltd.",
    "GCCP Co. Ltd.: Ready-Mix Concrete": "GCCP Co. Ltd.: Betão pronto",
    "GCCP Concrete (12)": "Betão GCCP (12)",
    "GCCP Ready-Mix Concrete": "Betão pronto GCCP",
    "GCCP operates its own quarry at Lugoba with two aggregate plants of 250 tons/hour capacity each, producing 30,000 m³ of aggregate monthly. Its ready-mix operations are powered by Sany International batching plants from China.":
        "A GCCP opera a sua própria pedreira em Lugoba com duas instalações de agregados de 250 toneladas/hora cada, produzindo 30.000 m³ de agregados por mês. As suas operações de betão pronto são alimentadas por centrais Sany International da China.",
    "GCCP supplied specialist high-performance ready-mix concrete to support civil works on Tanzania's flagship 2,115 MW Julius Nyerere Hydropower Project at Stiegler's Gorge.":
        "A GCCP forneceu betão pronto de alto desempenho para apoiar as obras civis do projeto hidroelétrico Julius Nyerere (2.115 MW) da Tanzânia, no desfiladeiro de Stiegler.",
    "GCCP's quarry operations at Lugoba include progressive land rehabilitation, restoring extracted areas to usable agricultural and ecological land.":
        "As operações de pedreira da GCCP em Lugoba incluem a reabilitação progressiva do solo, restaurando as áreas extraídas para terras agrícolas e ecológicas utilizáveis.",
    "GCCP, Concrete Boom Pump (32m) at Construction Site": "GCCP, bomba de betão de lança (32 m) num canteiro de obras",
    "GCCP, Foundation & Piling Concrete Operations": "GCCP, operações de betão para fundações e estacas",
    "GCCP, Gulf Concrete Batching Plant, Dar es Salaam": "GCCP, central de betão Gulf, Dar es Salaam",
    "GCCP, Heavy Equipment & Sany Batching Systems": "GCCP, equipamento pesado e sistemas de dosagem Sany",
    "GCCP, Lugoba Quarry Aggregate Production": "GCCP, produção de agregados na pedreira de Lugoba",
    "GCCP, Mixer Truck Fleet (20 units, 12m³ each)": "GCCP, frota de camiões-betoneira (20 unidades, 12 m³ cada)",
    "GCCP, Plant Overview, Vijibweni Area": "GCCP, visão geral da fábrica, zona de Vijibweni",
    "GCCP, Quality Assurance & Testing Laboratory": "GCCP, laboratório de garantia de qualidade e testes",
    "GCCP, Ready-Mix Concrete Delivery Operations": "GCCP, operações de entrega de betão pronto",
    "GCCP, Ready-Mix Supply to Prestige Projects": "GCCP, fornecimento de betão para projetos de prestígio",
    "GCCP, Sany International Aggregate Plant (250T/hr)": "GCCP, instalação de agregados Sany International (250 t/h)",
    "GCCP, Truck Mixer Loading at Batching Plant": "GCCP, carregamento de camião-betoneira na central",
    "Gulf Aggregate: Stone Crushing": "Gulf Aggregate: britagem de pedra",
    "Gulf Cement & Concrete Products (GCCP)": "Gulf Cement & Concrete Products (GCCP)",
    "Gulf Concrete and Cement Products Company (GCCP) is established, quickly becoming the market leader in ready-mix concrete supply in Dar es Salaam.":
        "É fundada a Gulf Concrete and Cement Products Company (GCCP), tornando-se rapidamente líder de mercado no fornecimento de betão pronto em Dar es Salaam.",
    "Gulf Concrete and Cement Products Company Ltd (GCCP), established in 2010, is one of the leading suppliers of ready-mix concrete in Dar es Salaam, involved in many of the city's most prestigious construction projects.":
        "A Gulf Concrete and Cement Products Company Ltd (GCCP), fundada em 2010, é um dos principais fornecedores de betão pronto em Dar es Salaam, envolvida em muitos dos projetos de construção mais prestigiados da cidade.",
    "Gulf Concrete and Cement Products, Dar es Salaam's market-leading ready-mix concrete supplier since 2010.":
        "Gulf Concrete and Cement Products, fornecedor líder de mercado de betão pronto em Dar es Salaam desde 2010.",
    "Hazmat Certified": "Certificado para materiais perigosos",
    "Headquarters · 10 subsidiaries": "Sede · 10 subsidiárias",
    "Heads people strategy and workforce development for Lake Oil, supporting the Group's diverse team of 4,600+ professionals across East and Central Africa.":
        "Dirige a estratégia de pessoas e o desenvolvimento da força de trabalho da Lake Oil, apoiando a equipa diversificada do Grupo com mais de 4.600 profissionais na África Oriental e Central.",
    "Heavy-duty flatbed and cargo trucks for construction materials, steel, containers and general freight.":
        "Camiões plataforma e de carga robustos para materiais de construção, aço, contentores e carga geral.",
    "Heavy-duty industrial oils for machinery, compressors and manufacturing equipment.":
        "Óleos industriais robustos para máquinas, compressores e equipamento de fabrico.",
    "Heavy-duty tankers for bulk liquid petroleum transport. Capacity from 30,000 to 60,000 litres. Full hazmat certification and GPS tracking.":
        "Camiões-cisterna robustos para transporte de petróleo líquido a granel. Capacidade de 30.000 a 60.000 litros. Certificação completa para materiais perigosos e rastreio por GPS.",
    "High rainfall / humidity": "Elevada pluviosidade / humidade",
    "High-finish concrete for facades, decorative surfaces and exposed structural elements.":
        "Betão de acabamento fino para fachadas, superfícies decorativas e elementos estruturais expostos.",
    "High-quality automotive, industrial and marine lubricants manufactured and distributed across East and Central Africa.":
        "Lubrificantes automóveis, industriais e marítimos de alta qualidade fabricados e distribuídos na África Oriental e Central.",
    "High-strength, highly durable concrete for piling, deep foundations and critical structures.":
        "Betão de alta resistência e durabilidade para estacas, fundações profundas e estruturas críticas.",
    "ICD, CFS and empty container depot services with rail-linked logistics in Tanzania.":
        "Serviços de depósito ICD, CFS e contentores vazios com logística ferroviária na Tanzânia.",
    "ISO-aligned environmental practices": "Práticas ambientais alinhadas com normas ISO",
    "Ideal Applications": "Aplicações ideais",
    "In Dubai, Lake Group operates <strong>MERM (Middle East Ready Mix LLC)</strong>, one of the largest premix plants in the region.":
        "Em Dubai, o Lake Group opera a <strong>MERM (Middle East Ready Mix LLC)</strong>, uma das maiores centrais de betão da região.",
    "Industrial Lubricants": "Lubrificantes industriais",
    "Industrial pollution zones": "Zonas de poluição industrial",
    "Inland depot serving the Zambia-Tanzania corridor": "Depósito interior que serve o corredor Zâmbia-Tanzânia",
    "Interactive Experience": "Experiência interativa",
    "Interactive map of Lake Group's presence across 8 countries in East and Central Africa, plus Dubai.":
        "Mapa interativo da presença do Lake Group em 8 países da África Oriental e Central, além de Dubai.",
    "Invoice, Dec 2024": "Fatura, dez. 2024",
    "Join our team or partner with us across Africa.": "Junte-se à nossa equipa ou seja nosso parceiro em toda a África.",
    "Julius Nyerere Hydropower – Concrete Supply": "Hidroelétrica Julius Nyerere – Fornecimento de betão",
    "Juma Nuru": "Juma Nuru",
    "KES (Kenyan Shilling)": "KES (Shilling queniano)",
    "Kariakoo, Dar es Salaam": "Kariakoo, Dar es Salaam",
    "Khalid Mohamed": "Khalid Mohamed",
    "LAKE OIL": "LAKE OIL",
    "LG-2024-8778": "LG-2024-8778", "LG-2024-8802": "LG-2024-8802",
    "LG-2024-8831": "LG-2024-8831", "LG-2024-8847": "LG-2024-8847",
    "LPG Bulk, 8MT": "GLP a granel, 8 t",
    "LPG Composite Cylinder Launch": "Lançamento do cilindro de GLP composto",
    "LPG Cylinder Exchange": "Troca de cilindros de GLP",
    "LPG Gas (5)": "Gás GLP (5)",
    "LPG Gas (Bulk / Cylinder)": "Gás GLP (a granel / cilindro)",
    "LPG Gas Distribution": "Distribuição de gás GLP",
    "LPG bottling, composite cylinders and East Africa's largest LPG storage terminal in Tanga.":
        "Engarrafamento de GLP, cilindros compostos e o maior terminal de armazenamento de GLP da África Oriental, em Tanga.",
    "LPG, a core business of Lake Gas, plays a critical role in East Africa's clean cooking agenda, reducing dependence on charcoal and firewood, improving indoor air quality and reducing deforestation.":
        "O GLP, principal negócio da Lake Gas, desempenha um papel fundamental na agenda de cozinha limpa da África Oriental, reduzindo a dependência de carvão e lenha, melhorando a qualidade do ar interior e reduzindo a desflorestação.",
    "LT-2024-00847": "LT-2024-00847",
    "Lake Agro Ltd": "Lake Agro Ltd",
    "Lake Gas Across Africa": "Lake Gas em toda a África",
    "Lake Gas Ltd": "Lake Gas Ltd", "Lake Gas Ltd.": "Lake Gas Ltd.",
    "Lake Gas Ltd. is East Africa's trusted LPG bottling and distribution company, operating across 7 countries. From domestic cooking to large-scale commercial kitchens and industrial applications, Lake Gas provides safe and reliable liquefied petroleum gas.":
        "A Lake Gas Ltd. é a empresa de confiança de engarrafamento e distribuição de GLP na África Oriental, presente em 7 países. Desde a cozinha doméstica até grandes cozinhas comerciais e aplicações industriais, a Lake Gas fornece gás de petróleo liquefeito seguro e fiável.",
    "Lake Gas Ltd.: LPG Bottling & Distribution": "Lake Gas Ltd.: Engarrafamento e distribuição de GLP",
    "Lake Gas Ltd.: LPG Distribution": "Lake Gas Ltd.: Distribuição de GLP",
    "Lake Gas Ltd.: LPG Distribution across East Africa": "Lake Gas Ltd.: Distribuição de GLP na África Oriental",
    "Lake Gas launches innovative composite cylinders in Dar es Salaam, non-explosive, non-corrosive, lightweight and translucent, a revolution for East Africa's cooking fuel market.":
        "A Lake Gas lança cilindros compostos inovadores em Dar es Salaam, não explosivos, não corrosivos, leves e translúcidos, uma revolução para o mercado de combustível de cozinha da África Oriental.",
    "Lake Gas pioneered the introduction of composite LPG cylinders in East Africa, non-explosive, lightweight and translucent, revolutionising domestic cooking gas safety.":
        "A Lake Gas foi pioneira na introdução de cilindros de GLP compostos na África Oriental, não explosivos, leves e translúcidos, revolucionando a segurança do gás de cozinha doméstico.",
    "Lake Gas supplies LPG to 7 countries, displacing millions of charcoal cookstoves. Every cylinder sold reduces CO₂, indoor air pollution and deforestation pressure.":
        "A Lake Gas fornece GLP a 7 países, substituindo milhões de fogões de carvão. Cada cilindro vendido reduz o CO₂, a poluição do ar interior e a pressão de desflorestação.",
    "Lake Gas, 10kg Composite Cylinder (Non-Explosive, Tran": "Lake Gas, cilindro composto de 10 kg (não explosivo, tran",
    "Lake Gas, 15kg Cylinder for Hotels & Restaurants": "Lake Gas, cilindro de 15 kg para hotéis e restaurantes",
    "Lake Gas, 38kg Commercial LPG Cylinder": "Lake Gas, cilindro comercial de GLP de 38 kg",
    "Lake Gas, 6kg Domestic LPG Cylinder": "Lake Gas, cilindro doméstico de GLP de 6 kg",
    "Lake Gas, Composite Cylinder Product Range": "Lake Gas, gama de cilindros compostos",
    "Lake Group Announces Expansion into Mozambique with New Fuel Depot and AFICD Operations":
        "Lake Group anuncia expansão para Moçambique com novo depósito de combustível e operações AFICD",
    "Lake Group Gallery": "Galeria Lake Group",
    "Lake Group News": "Notícias do Lake Group",
    "Lake Group Workforce Exceeds 4,600 Employees Across 8 Countries": "Força de trabalho do Lake Group ultrapassa 4.600 colaboradores em 8 países",
    "Lake Group continues to expand, deepening its regional footprint, investing in new technologies, and driving economic development across East and Central Africa.":
        "O Lake Group continua a expandir-se, aprofundando a sua presença regional, investindo em novas tecnologias e impulsionando o desenvolvimento económico na África Oriental e Central.",
    "Lake Group expands operations into Kenya, Zambia, Burundi and Rwanda, bringing fuel, LPG and lubricants to neighbouring markets.":
        "O Lake Group expande as operações para o Quénia, Zâmbia, Burundi e Ruanda, levando combustível, GLP e lubrificantes aos mercados vizinhos.",
    "Lake Group has demonstrated consistent and significant growth since its founding in 2006. From a single petroleum distributor in Dar es Salaam, it has grown into a diversified conglomerate operating across 8 countries with 20+ subsidiaries.":
        "O Lake Group tem demonstrado um crescimento consistente e significativo desde a sua fundação em 2006. De um único distribuidor de petróleo em Dar es Salaam, tornou-se um conglomerado diversificado presente em 8 países com mais de 20 subsidiárias.",
    "Lake Group has formally inaugurated its Mozambique operations, establishing Lake Oil LDA and an AFICD inland container depot to serve growing trade flows along the Beira corridor.":
        "O Lake Group inaugurou formalmente as suas operações em Moçambique, estabelecendo a Lake Oil LDA e um depósito interior de contentores AFICD para servir os crescentes fluxos comerciais ao longo do corredor de Beira.",
    "Lake Group has reported continued workforce growth, now employing over 4,600 professionals across 20+ subsidiaries in 8 countries, representing 21 nationalities.":
        "O Lake Group reportou um crescimento contínuo da força de trabalho, empregando agora mais de 4.600 profissionais em mais de 20 subsidiárias em 8 países, representando 21 nacionalidades.",
    "Lake Group in Action <span class=\"g-count\">39 Photos</span>": "Lake Group em ação <span class=\"g-count\">39 fotografias</span>",
    "Lake Group is geographically spread across every region of Tanzania and neighbouring countries of Zambia, DRC, Burundi, Rwanda and Kenya, with operations in Ethiopia, Mozambique and a major premix plant in Dubai.":
        "O Lake Group está geograficamente presente em todas as regiões da Tanzânia e países vizinhos (Zâmbia, RDC, Burundi, Ruanda e Quénia), com operações na Etiópia, Moçambique e uma grande central de betão em Dubai.",
    "Lake Group offers careers with real impact, you'll work across one of East Africa's most dynamic businesses, with genuine opportunities to grow, lead and make a difference.":
        "O Lake Group oferece carreiras com impacto real: vai trabalhar numa das empresas mais dinâmicas da África Oriental, com oportunidades genuínas de crescer, liderar e fazer a diferença.",
    "Lake Group surpasses 4,000 employees across 20+ subsidiaries, with 21 nationalities represented in the workforce. Mozambique operations begin.":
        "O Lake Group ultrapassa os 4.000 colaboradores em mais de 20 subsidiárias, com 21 nacionalidades representadas na força de trabalho. Iniciam-se as operações em Moçambique.",
    "Lake Group's workforce reflects the rich diversity of the African continent, with 4,600+ professionals from 21 nationalities working together toward shared goals.":
        "A força de trabalho do Lake Group reflete a rica diversidade do continente africano, com mais de 4.600 profissionais de 21 nacionalidades a trabalhar juntos para objetivos comuns.",
    "Lake Lubes Ltd": "Lake Lubes Ltd", "Lake Lubes Ltd.": "Lake Lubes Ltd.",
    "Lake Lubes Ltd. manufactures and distributes a comprehensive range of lubricants serving automotive, industrial and marine sectors across East and Central Africa.":
        "A Lake Lubes Ltd. fabrica e distribui uma gama completa de lubrificantes para os setores automóvel, industrial e marítimo na África Oriental e Central.",
    "Lake Lubes Ltd.: Lubricants": "Lake Lubes Ltd.: Lubrificantes",
    "Lake Lubes Ltd.: Lubricants Manufacturing": "Lake Lubes Ltd.: Fabrico de lubrificantes",
    "Lake Oil Founded": "Fundação da Lake Oil",
    "Lake Oil Ltd": "Lake Oil Ltd", "Lake Oil Ltd.": "Lake Oil Ltd.",
    "Lake Oil Ltd.: Fuel Station Operations": "Lake Oil Ltd.: Operações de postos de combustível",
    "Lake Oil Ltd.: Petroleum Distribution": "Lake Oil Ltd.: Distribuição de petróleo",
    "Lake Oil Ltd.: Petroleum Supply Operations": "Lake Oil Ltd.: Operações de fornecimento de petróleo",
    "Lake Oil Stations": "Postos Lake Oil",
    "Lake Oil and Lake Trans jointly operate one of East Africa's largest petroleum supply chains, distributing fuel to 8 countries with 700+ trucks running 24/7.":
        "A Lake Oil e a Lake Trans operam conjuntamente uma das maiores cadeias de fornecimento de petróleo da África Oriental, distribuindo combustível a 8 países com mais de 700 camiões a circular 24 horas por dia.",
    "Lake Oil: Arusha Town": "Lake Oil: Cidade de Arusha", "Lake Oil: Dodoma": "Lake Oil: Dodoma",
    "Lake Oil: Kariakoo": "Lake Oil: Kariakoo", "Lake Oil: Mikocheni": "Lake Oil: Mikocheni",
    "Lake Oil: Mwanza": "Lake Oil: Mwanza",
    "Lake Petroleum Ltd.": "Lake Petroleum Ltd.",
    "Lake Steel Launched": "Lançamento da Lake Steel",
    "Lake Steel Ltd.": "Lake Steel Ltd.",
    "Lake Steel Ltd. becomes the first company in Tanzania to introduce High Strength, Corrosion Resistant (HS-CR) reinforcement steel bars. A fully computerised rolling mill with 100,000 MT/yr capacity.":
        "A Lake Steel Ltd. torna-se a primeira empresa na Tanzânia a introduzir varões de armadura de alta resistência e resistentes à corrosão (HS-CR). Um laminador totalmente informatizado com capacidade de 100.000 t/ano.",
    "Lake Steel Ltd. is the <strong>first company in Tanzania</strong> to introduce unique High Strength, Corrosion Resistant (HS-CR) reinforcement steel bars, a game-changer for the East African construction industry.":
        "A Lake Steel Ltd. é a <strong>primeira empresa na Tanzânia</strong> a introduzir varões de armadura únicos de alta resistência e resistentes à corrosão (HS-CR), uma mudança radical para a indústria da construção da África Oriental.",
    "Lake Steel Ltd.: HS-CR Steel Rolling Mill": "Lake Steel Ltd.: Laminador de aço HS-CR",
    "Lake Steel Reaches Cumulative 500,000 MT Production Milestone": "Lake Steel atinge o marco cumulativo de 500.000 toneladas de produção",
    "Lake Steel Rolling Mill, Tanzania First": "Laminador Lake Steel, primeiro na Tanzânia",
    "Lake Trans Ltd": "Lake Trans Ltd", "Lake Trans Ltd.": "Lake Trans Ltd.",
    "Lake Trans Ltd. is established to handle bulk liquid haulage, rapidly expanding the Group's logistics footprint across Tanzania.":
        "A Lake Trans Ltd. é fundada para gerir o transporte de líquidos a granel, expandindo rapidamente a presença logística do Grupo na Tanzânia.",
    "Lake Trans Ltd. is one of East Africa's largest logistics operators, running a fleet of 700+ trucks for bulk liquid haulage, general cargo and regional cross-border transport.":
        "A Lake Trans Ltd. é um dos maiores operadores logísticos da África Oriental, operando uma frota de mais de 700 camiões para transporte de líquidos a granel, carga geral e transporte regional transfronteiriço.",
    "Lake Trans Ltd.: Transport & Haulage": "Lake Trans Ltd.: Transporte e logística",
    "Largest Petroleum Distributors in Tanzania": "Maiores distribuidores de petróleo na Tanzânia",
    "Leads Lake Oil's petroleum distribution, retail network and corporate partnerships, representing the flagship company at major industry and community events across Tanzania.":
        "Dirige a distribuição de petróleo, a rede de retalho e as parcerias corporativas da Lake Oil, representando a empresa principal em grandes eventos da indústria e da comunidade na Tanzânia.",
    "Light Commercial Vehicles": "Veículos comerciais ligeiros",
    "LinkedIn": "LinkedIn",
    "Loaded & Dispatched": "Carregado e expedido",
    "Local CSR programmes active": "Programas de RSC locais ativos",
    "Local Employment": "Emprego local",
    "Local jobs created": "Empregos locais criados",
    "Local jobs created across 8 countries": "Empregos locais criados em 8 países",
    "Locate the nearest Lake Oil fuel station, check opening hours and available services.":
        "Localize o posto de combustível Lake Oil mais próximo, consulte horários e serviços disponíveis.",
    "Logistics / Transport": "Logística / Transporte",
    "Logistics Coordinator": "Coordenador de logística",
    "Logistics Division Launched": "Lançamento da divisão de logística",
    "Logistics Tracking": "Rastreio logístico",
    "Low shrinkage formulation for slabs, pavements and structures where crack control is critical.":
        "Formulação de baixa retração para lajes, pavimentos e estruturas onde o controlo de fissuras é fundamental.",
    "Lubricant blending plant in Dar es Salaam producing greases and engine oils for regional markets.":
        "Fábrica de mistura de lubrificantes em Dar es Salaam que produz graxas e óleos de motor para mercados regionais.",
    "Lubricants & Lube Products": "Lubrificantes e produtos lubrificantes",
    "MERM (Middle East Ready Mix LLC)": "MERM (Middle East Ready Mix LLC)",
    "MERM Dubai (10)": "MERM Dubai (10)",
    "MERM Ready Mix, Dubai Expansion": "MERM Ready Mix, expansão em Dubai",
    "MERM: Aggregate & Materials Storage, UAE": "MERM: Armazenamento de agregados e materiais, EAU",
    "MERM: Batching Plant Operations, Dubai": "MERM: Operações de central de betão, Dubai",
    "MERM: Concrete Supply to UAE Construction Projects": "MERM: Fornecimento de betão a projetos de construção nos EAU",
    "MERM: Lake Group Middle East Operations": "MERM: Operações do Lake Group no Médio Oriente",
    "MERM: Middle East Ready Mix LLC": "MERM: Middle East Ready Mix LLC",
    "MERM: Middle East Ready Mix LLC, Dubai, UAE": "MERM: Middle East Ready Mix LLC, Dubai, EAU",
    "MERM: Mixer Truck Fleet at Dubai Plant": "MERM: Frota de camiões-betoneira na fábrica de Dubai",
    "MERM: One of the Largest Premix Plants in the UAE": "MERM: Uma das maiores centrais de betão nos EAU",
    "MERM: Quality Control Laboratory, Dubai": "MERM: Laboratório de controlo de qualidade, Dubai",
    "MERM: Ready-Mix Concrete Fleet, Dubai": "MERM: Frota de betão pronto, Dubai",
    "MERM: Ready-Mix Concrete Production Line, UAE": "MERM: Linha de produção de betão pronto, EAU",
    "Major Facilities": "Principais instalações",
    "Manages major Group projects including Lake Agro's greenfield development and coordinates humanitarian relief efforts such as flood-response aid in Rufiji and coastal regions.":
        "Gere os principais projetos do Grupo, incluindo o desenvolvimento de novos terrenos da Lake Agro, e coordena esforços de ajuda humanitária, como a resposta a inundações em Rufiji e regiões costeiras.",
    "Managing Director · Lake Oil Tanzania": "Diretor-Geral · Lake Oil Tanzânia",
    "Marine Lubricants": "Lubrificantes marítimos",
    "Marine environments": "Ambientes marítimos",
    "Media Resources": "Recursos para a imprensa",
    "Middle East Ready Mix LLC (MERM), Lake Group's Dubai-based premix concrete operation, is one of the largest ready-mix plants in the UAE, serving major construction projects.":
        "A Middle East Ready Mix LLC (MERM), a operação de betão pronto do Lake Group baseada em Dubai, é uma das maiores centrais de betão pronto nos EAU, servindo grandes projetos de construção.",
    "Mikocheni Light Industrial Area, Dar es Salaam": "Zona Industrial Ligeira de Mikocheni, Dar es Salaam",
    "Mon–Sun 5:00am – 11:00pm  |  Petrol, Diesel, Lubricants": "Seg-Dom 5h00-23h00 | Gasolina, gasóleo, lubrificantes",
    "Mon–Sun 5:30am – 10:00pm  |  Petrol, Diesel, LPG": "Seg-Dom 5h30-22h00 | Gasolina, gasóleo, GLP",
    "Mon–Sun 6:00am – 9:00pm  |  Petrol, Diesel, Truck Diesel": "Seg-Dom 6h00-21h00 | Gasolina, gasóleo, gasóleo para camiões",
    "Mr. Awadh established Lake Oil at age 27 and grew it into one of East and Central Africa's largest energy, logistics and industrial conglomerates, operating across Tanzania, Kenya, Zambia, DRC, Burundi, Rwanda, Ethiopia and Mozambique with 4,600+ employees from 21 nationalities.":
        "O Sr. Awadh fundou a Lake Oil aos 27 anos e transformou-a num dos maiores conglomerados de energia, logística e industriais da África Oriental e Central, presente na Tanzânia, Quénia, Zâmbia, RDC, Burundi, Ruanda, Etiópia e Moçambique, com mais de 4.600 colaboradores de 21 nacionalidades.",
    "Multiple Locations": "Múltiplas localizações", "Multiple Services": "Múltiplos serviços",
    "Mwanza City, Lake Victoria Region": "Cidade de Mwanza, região do Lago Victoria",
    "Nassoro Abubakari": "Nassoro Abubakari",
    "Network in Action": "Rede em ação",
    "No compromise on quality, from fuel and LPG to steel, lubricants and ready-mix concrete.":
        "Sem compromissos na qualidade, do combustível e GLP ao aço, lubrificantes e betão pronto.",
    "Not a corporate client?": "Não é cliente corporativo?",
    "Nov 5, 2024": "5 nov. 2024", "Oct 1, 2024": "1 out. 2024",
    "Oil analysis, technical advice and maintenance support for corporate fleet customers.":
        "Análise de óleo, aconselhamento técnico e apoio à manutenção para clientes de frotas corporativas.",
    "One of the largest premix concrete plants in the UAE, serving major Dubai construction projects.":
        "Uma das maiores centrais de betão pronto nos EAU, ao serviço de grandes projetos de construção em Dubai.",
    "Ongoing investment in newer, fuel-efficient trucks, reducing per-kilometre emissions across our 700+ vehicle fleet while improving service reliability.":
        "Investimento contínuo em camiões mais recentes e eficientes em combustível, reduzindo as emissões por quilómetro na nossa frota de mais de 700 veículos, ao mesmo tempo que melhora a fiabilidade do serviço.",
    "Open Opportunities": "Vagas abertas",
    "Operating History": "Histórico operacional",
    "Operations (9)": "Operações (9)",
    "Operations Across the Continent": "Operações em todo o continente",
    "Operations across 8 high-growth East and Central African markets, some of the world's fastest-growing economies by GDP and population.":
        "Operações em 8 mercados de elevado crescimento da África Oriental e Central, algumas das economias que mais crescem no mundo em PIB e população.",
    "Order Confirmed": "Encomenda confirmada",
    "Order LPG Supply": "Encomendar fornecimento de GLP",
    "Order Lubricants": "Encomendar lubrificantes",
    "Our Depot Locations": "As nossas localizações de depósito",
    "Our HS-CR bars maintain strength at temperatures up to 600°C, compared to 350°C for ordinary rebars, providing critical fire resistance advantages for major construction projects.":
        "Os nossos varões HS-CR mantêm a resistência a temperaturas até 600 °C, em comparação com 350 °C para varões comuns, proporcionando vantagens críticas de resistência ao fogo para grandes projetos de construção.",
    "Our LPG Cylinders": "Os nossos cilindros de GLP",
    "Our Plant in Action": "A nossa fábrica em ação",
    "Our financial strength, high credit rating in the global business community, and diversified revenue streams across energy, logistics and construction materials make Lake Group a resilient and high-potential investment.":
        "A nossa solidez financeira, elevada classificação de crédito na comunidade empresarial global e fontes de receita diversificadas em energia, logística e materiais de construção tornam o Lake Group um investimento resiliente e de elevado potencial.",
    "Our innovative composite cylinder range, launched in Dar es Salaam, marks a new revolution in cooking gas technology, combining safety with aesthetics.":
        "A nossa gama inovadora de cilindros compostos, lançada em Dar es Salaam, marca uma nova revolução na tecnologia de gás de cozinha, combinando segurança e estética.",
    "Our leadership team brings together decades of expertise across energy, logistics, finance and engineering.":
        "A nossa equipa de liderança reúne décadas de experiência em energia, logística, finanças e engenharia.",
    "Our lubricants are formulated to meet international standards, providing superior protection and performance even in Africa's most demanding operating environments.":
        "Os nossos lubrificantes são formulados para cumprir normas internacionais, proporcionando proteção e desempenho superiores mesmo nos ambientes operacionais mais exigentes de África.",
    "Our petrol stations are instantly recognisable in <strong>eye-catching blue, white, yellow and red</strong>, the same bold Lake Group colours you'll see on the map below.":
        "Os nossos postos de combustível são instantaneamente reconhecíveis em <strong>azul, branco, amarelo e vermelho vibrantes</strong>, as mesmas cores marcantes do Lake Group que verá no mapa abaixo.",
    "Our sales team is available Mon–Fri 9:00–18:00 EAT.": "A nossa equipa de vendas está disponível de segunda a sexta, das 9h00 às 18h00 (hora da África Oriental).",
    "Our state-of-the-art, fully computerised and automatic Steel Rolling Mill plant has a production capacity of up to <strong>25 tonnes per hour</strong>, translating to an annual capacity of <strong>100,000 metric tonnes</strong> of high-quality steel bars.":
        "O nosso laminador de aço de última geração, totalmente informatizado e automático, tem uma capacidade de produção de até <strong>25 toneladas por hora</strong>, traduzindo-se numa capacidade anual de <strong>100.000 toneladas métricas</strong> de varões de aço de alta qualidade.",
    "Our sustainability strategy covers environmental stewardship, clean cooking energy access, land reclamation, waste management and progressive decarbonisation of our logistics fleet.":
        "A nossa estratégia de sustentabilidade abrange a gestão ambiental, o acesso a energia de cozinha limpa, a recuperação de terras, a gestão de resíduos e a descarbonização progressiva da nossa frota logística.",
    "Our team reviews it": "A nossa equipa analisa-a",
    "Over 700 purpose-built trucks operating 24/7 across East and Central Africa, the backbone of our logistics operations.":
        "Mais de 700 camiões construídos especificamente, a operar 24 horas por dia na África Oriental e Central, a espinha dorsal das nossas operações logísticas.",
    "Oversees Group-wide executive operations and represents Lake Group at CSR initiatives, hospital donations and community outreach programmes across Dar es Salaam.":
        "Supervisiona as operações executivas em todo o Grupo e representa o Lake Group em iniciativas de RSC, doações hospitalares e programas comunitários em Dar es Salaam.",
    "Own storage facilities, truck fleet (700+), rolling mill, concrete plants, quarry and container depots, significant hard-asset base.":
        "Instalações de armazenamento próprias, frota de camiões (mais de 700), laminador, centrais de betão, pedreira e depósitos de contentores: uma base significativa de ativos tangíveis.",
    "Pan-African Footprint": "Presença pan-africana",
    "Pan-African Impact": "Impacto pan-africano",
    "Pan-African Petroleum Supply Chain": "Cadeia de fornecimento de petróleo pan-africana",
    "Pan-African Supply Chain Operations": "Operações de cadeia de fornecimento pan-africana",
    "Permeable concrete for sustainable drainage in car parks, roads and landscaping.":
        "Betão permeável para drenagem sustentável em parques de estacionamento, estradas e paisagismo.",
    "Pervious Concrete": "Betão permeável",
    "Petroleum Engineer": "Engenheiro de petróleo",
    "Petroleum Products across East Africa": "Produtos petrolíferos na África Oriental",
    "Petroleum, 50,000L": "Petróleo, 50.000 L",
    "Piling & Foundation Concrete": "Betão para estacas e fundações",
    "Place New Order": "Fazer nova encomenda",
    "Plot 49, Mikocheni Light Industrial, Dar es Salaam": "Plot 49, Mikocheni Light Industrial, Dar es Salaam",
    "Port Extension Services": "Serviços de extensão portuária",
    "Position of Interest": "Cargo de interesse",
    "Powering homes, restaurants and industry across 7 East African countries with safe, reliable LPG cylinders.":
        "Alimentando casas, restaurantes e indústrias em 7 países da África Oriental com cilindros de GLP seguros e fiáveis.",
    "Prefer to call?": "Prefere ligar?",
    "Press releases, official statements, corporate videos and downloadable media assets for Lake Group.":
        "Comunicados de imprensa, declarações oficiais, vídeos corporativos e recursos de media para download do Lake Group.",
    "Pressure Certified": "Certificado para pressão",
    "Product Categories": "Categorias de produtos",
    "Production Capacity": "Capacidade de produção",
    "Production Process": "Processo de produção",
    "Professionalism is the culture we cherish, 4,600+ staff from 21 nationalities, one team.":
        "O profissionalismo é a cultura que valorizamos: mais de 4.600 colaboradores de 21 nacionalidades, uma só equipa.",
    "Projects Manager · Lake Group": "Gestor de Projetos · Lake Group",
    "Proven Vertical Growth": "Crescimento vertical comprovado",
    "Purpose-Built for Africa's Roads": "Construído especificamente para as estradas de África",
    "Purpose-Built for Every Load": "Construído especificamente para cada carga",
    "Quality testing to national and international standards before dispatch.":
        "Testes de qualidade segundo normas nacionais e internacionais antes do envio.",
    "Quarry Land Reclamation": "Recuperação de terras de pedreira",
    "Raw Material Testing": "Testes de matérias-primas",
    "Reach stackers, terminal tractors and container trucks for AFICD inland depot operations in Tanzania, Zambia and Mozambique.":
        "Reach stackers, tratores de terminal e camiões de contentores para operações de depósito interior da AFICD na Tanzânia, Zâmbia e Moçambique.",
    "Ready-Mix Concrete": "Betão pronto",
    "Ready-Mix Concrete & Aggregate": "Betão pronto e agregados",
    "Ready-Mix Concrete / Aggregate": "Betão pronto / agregados",
    "Ready-mix concrete and aggregates, market leader in Dar es Salaam premix supply.":
        "Betão pronto e agregados, líder de mercado no fornecimento de betão em Dar es Salaam.",
    "Real photos from our operations, GCCP concrete plant, MERM Dubai, LPG cylinders, fuel operations and more.":
        "Fotografias reais das nossas operações, central de betão GCCP, MERM Dubai, cilindros de GLP, operações de combustível e mais.",
    "Real photos sourced directly from lakeoilgroup.com, our operations across East Africa and the Middle East.":
        "Fotografias reais obtidas diretamente de lakeoilgroup.com, das nossas operações na África Oriental e no Médio Oriente.",
    "Regional Expansion Begins": "Início da expansão regional",
    "Regional Presence": "Presença regional",
    "Request Concrete Quote": "Pedir orçamento de betão",
    "Request Container Quote": "Pedir orçamento de contentor",
    "Request Steel Quote": "Pedir orçamento de aço",
    "Request Transport Quote": "Pedir orçamento de transporte",
    "Request a Transport Quote": "Pedir um orçamento de transporte",
    "Response within 1 business day": "Resposta em 1 dia útil",
    "Responsible Growth. Lasting Impact.": "Crescimento responsável. Impacto duradouro.",
    "Responsible handling of petroleum products, zero-tolerance for spillage, and progressive adoption of cleaner operations. Active reclamation of quarry land at Lugoba.":
        "Manuseamento responsável de produtos petrolíferos, tolerância zero a derrames e adoção progressiva de operações mais limpas. Recuperação ativa de terras de pedreira em Lugoba.",
    "SAFF: Aggregates": "SAFF: Agregados",
    "Safety is first in all we do, across depots, haulage fleets, LPG terminals and construction sites.":
        "A segurança é prioritária em tudo o que fazemos, em depósitos, frotas de transporte, terminais de GLP e canteiros de obras.",
    "Saline sub-soil": "Subsolo salino",
    "Scholarships and skills programmes": "Bolsas e programas de competências",
    "Search by city or region": "Pesquisar por cidade ou região",
    "Select a Country": "Selecionar um país",
    "Select a service": "Selecionar um serviço",
    "Select your country": "Selecione o seu país",
    "Self-Consolidating Concrete (SCC)": "Betão autocompactável (BAC)",
    "Senior Leadership": "Liderança sénior",
    "Service Regions": "Regiões de serviço",
    "Service Required *": "Serviço necessário *",
    "Services Offered": "Serviços oferecidos",
    "Services Subscribed": "Serviços subscritos",
    "Shipment Tracker": "Rastreador de envios",
    "Sign In to Your Account": "Inicie sessão na sua conta",
    "Specialised bulk liquid tankers for safe petroleum transport, fully compliant with regional hazmat regulations.":
        "Camiões-cisterna especializados para transporte seguro de líquidos a granel, totalmente conformes com os regulamentos regionais para materiais perigosos.",
    "Specialised pressurised tankers for bulk LPG transport between bottling plants and distribution points across East Africa.":
        "Camiões-cisterna pressurizados especializados para transporte de GLP a granel entre fábricas de engarrafamento e pontos de distribuição na África Oriental.",
    "Specialist Concrete Portfolio": "Portefólio especializado de betão",
    "Specialist marine engine oils and gear lubricants for Lake Victoria and coastal vessels.":
        "Óleos de motor marítimos especializados e lubrificantes de engrenagens para embarcações do Lago Victoria e costeiras.",
    "Spread Across Every Corner of East & Central Africa": "Presente em todos os cantos da África Oriental e Central",
    "Station Services Include": "Os serviços do posto incluem",
    "Steel (Rebar / HS-CR)": "Aço (varão / HS-CR)",
    "Steel Manufacturing": "Fabrico de aço",
    "Steel Rebar, 120MT": "Varão de aço, 120 t",
    "Steel manufacturing including HS-CR rebars and construction materials for infrastructure projects.":
        "Fabrico de aço, incluindo varões HS-CR e materiais de construção para projetos de infraestrutura.",
    "Strategic port logistics for Beira corridor trade flows": "Logística portuária estratégica para os fluxos comerciais do corredor de Beira",
    "Strong Leadership": "Liderança forte",
    "Stronger than Standard": "Mais resistente que o padrão",
    "Submit Application": "Submeter candidatura",
    "Submit Enquiry →": "Submeter pedido →",
    "Submit your requirements and our team will respond within 24 hours with a tailored proposal.":
        "Submeta os seus requisitos e a nossa equipa responderá dentro de 24 horas com uma proposta personalizada.",
    "Support fleet of pickups, service vehicles and supervisor cars for field operations, maintenance and last-mile delivery support.":
        "Frota de apoio de pick-ups, veículos de serviço e carros de supervisão para operações no terreno, manutenção e apoio à entrega de última milha.",
    "Supporting reliable LPG access for households across East Africa, reducing dependence on charcoal, improving air quality and lowering deforestation pressure.":
        "Apoiando o acesso fiável ao GLP para os agregados familiares na África Oriental, reduzindo a dependência do carvão, melhorando a qualidade do ar e reduzindo a pressão de desflorestação.",
    "Supporting scholarships, vocational training and STEM education for youth in Tanzania and across the region, building the next generation of energy professionals.":
        "Apoiando bolsas, formação profissional e educação STEM para jovens na Tanzânia e em toda a região, formando a próxima geração de profissionais da energia.",
    "Sustainability Enquiries": "Pedidos sobre sustentabilidade",
    "Sustainability by the Numbers": "A sustentabilidade em números",
    "TZ / ZM / MZ": "TZ / ZM / MZ",
    "TZS (Tanzanian Shilling)": "TZS (Shilling tanzaniano)",
    "Tailored proposal within 24 hours": "Proposta personalizada em 24 horas",
    "Tanzania Energy Forum 2025": "Fórum de Energia da Tanzânia 2025",
    "Tanzania's first HS-CR rebar manufacturer, Lake Steel Ltd., has celebrated a major production milestone, 500,000 metric tonnes of high-strength corrosion-resistant rebars since commissioning.":
        "A Lake Steel Ltd., primeira fabricante de varões HS-CR da Tanzânia, celebrou um importante marco de produção: 500.000 toneladas métricas de varões de alta resistência e resistentes à corrosão desde o início de operação.",
    "Tanzania's first HS-CR rebar producer. The fully computerised 25T/hr rolling mill has supplied 100,000+ MT of high-strength corrosion-resistant steel to the construction sector.":
        "Primeira produtora de varões HS-CR da Tanzânia. O laminador totalmente informatizado de 25 t/h forneceu mais de 100.000 toneladas de aço de alta resistência e resistente à corrosão ao setor da construção.",
    "Tanzania's first producer of HS-CR reinforcement steel bars. Fully computerised rolling mill with 100,000 MT annual capacity.":
        "Primeira produtora da Tanzânia de varões de armadura HS-CR. Laminador totalmente informatizado com capacidade anual de 100.000 toneladas.",
    "Tell Us What You Need": "Diga-nos o que precisa",
    "Tell us about yourself and what you bring to Lake Group...": "Fale-nos sobre si e o que pode trazer ao Lake Group...",
    "Territories incl. Dubai": "Territórios incl. Dubai",
    "The Backbone of East Africa's Supply Chain": "A espinha dorsal da cadeia de fornecimento da África Oriental",
    "The Group is privately held, headquartered in Tanzania, and has a direct economic impact in every market it operates, supporting local employment, supply chains and infrastructure development.":
        "O Grupo é uma empresa privada, com sede na Tanzânia, e tem um impacto económico direto em todos os mercados onde opera, apoiando o emprego local, as cadeias de fornecimento e o desenvolvimento de infraestruturas.",
    "The Inland Gateway to East African Trade": "A porta de entrada interior do comércio da África Oriental",
    "The Lake Group Story": "A história do Lake Group",
    "The Lake Trans Fleet": "A frota Lake Trans",
    "The executives overseeing Lake Group's day-to-day operations, people and strategic growth.":
        "Os executivos que supervisionam as operações diárias, as pessoas e o crescimento estratégico do Lake Group.",
    "The same principles that power our homepage, quality, service, safety and professionalism, guide every market we operate in.":
        "Os mesmos princípios que impulsionam a nossa página inicial, qualidade, serviço, segurança e profissionalismo, orientam todos os mercados onde operamos.",
    "The visionaries and industry professionals driving Lake Group's growth across East and Central Africa.":
        "Os visionários e profissionais do setor que impulsionam o crescimento do Lake Group na África Oriental e Central.",
    "Tolerance for petroleum spillage incidents": "Tolerância a incidentes de derrame de petróleo",
    "Tomorrow 14:00": "Amanhã 14h00",
    "Track Your Shipment": "Rastreie o seu envio",
    "Track a Shipment": "Rastrear um envio",
    "Track your Lake Trans delivery using your tracking ID or truck registration number.":
        "Rastreie a sua entrega Lake Trans utilizando o número de rastreio ou a matrícula do camião.",
    "Truck Driver (Class C)": "Motorista de camião (categoria C)",
    "Truck Mixers (12m³)": "Camiões-betoneira (12 m³)",
    "Truck Registration Number": "Número de matrícula do camião",
    "Trucks on the Road": "Camiões em circulação",
    "USD ($)": "USD ($)",
    "Ultra-Rapid Hardening Concrete": "Betão de endurecimento ultrarrápido",
    "Under his leadership the Group has expanded into Lake Trans, Lake Gas, Lake Lubes, Lake Steel, Gulf Cement & Concrete Products, African Inland Container Depot and regional oil storage and retail networks.":
        "Sob a sua liderança, o Grupo expandiu-se para a Lake Trans, Lake Gas, Lake Lubes, Lake Steel, Gulf Cement & Concrete Products, African Inland Container Depot e redes regionais de armazenamento e retalho de petróleo.",
    "Upcoming Events": "Próximos eventos",
    "Upload CV (PDF)": "Carregar CV (PDF)",
    "Uploaded: Dec 16, 2024": "Carregado: 16 dez. 2024",
    "Uploaded: Dec 20, 2024": "Carregado: 20 dez. 2024",
    "Versatile flatbed and curtain-side trailers for steel, construction materials, containers and oversized cargo across the region.":
        "Atrelados plataforma e de cortinas versáteis para aço, materiais de construção, contentores e carga de grandes dimensões na região.",
    "View Africa Network": "Ver rede em África",
    "View CSR Initiatives": "Ver iniciativas de RSC",
    "View Our Full Fleet": "Ver toda a nossa frota",
    "Wadi Elsundus Petroleum Co.": "Wadi Elsundus Petroleum Co.",
    "We are always looking for talented, driven professionals to join our growing team across East and Central Africa.":
        "Estamos sempre à procura de profissionais talentosos e motivados para se juntarem à nossa equipa em crescimento na África Oriental e Central.",
    "We believe that business growth and community development go hand in hand, and that our success must translate into tangible benefits for the people and environments in which we operate.":
        "Acreditamos que o crescimento empresarial e o desenvolvimento comunitário andam de mãos dadas, e que o nosso sucesso deve traduzir-se em benefícios tangíveis para as pessoas e ambientes onde operamos.",
    "We receive your enquiry": "Recebemos o seu pedido",
    "What Drives Our Value": "O que impulsiona o nosso valor",
    "What Happens Next?": "O que acontece a seguir?",
    "What's happening at announcements, expansions, product launches and community activities.":
        "O que está a acontecer: anúncios, expansões, lançamentos de produtos e atividades comunitárias.",
    "Why Lake Group Stands Out Across Africa": "Porque o Lake Group se destaca em África",
    "Why Work With Us": "Porque trabalhar connosco",
    "With 4,600+ employees across 8 countries and 21 nationalities, we are a truly pan-African team united by shared values: Quality, Service, Safety and Professionalism.":
        "Com mais de 4.600 colaboradores em 8 países e 21 nacionalidades, somos uma equipa verdadeiramente pan-africana unida por valores partilhados: qualidade, serviço, segurança e profissionalismo.",
    "With operations in Tanzania, Zambia and Mozambique, our container services are positioned at strategic corridors to serve regional importers, exporters and shipping lines.":
        "Com operações na Tanzânia, Zâmbia e Moçambique, os nossos serviços de contentores estão posicionados em corredores estratégicos para servir importadores, exportadores e companhias de navegação regionais.",
    "Within 4 working hours": "No prazo de 4 horas úteis",
    "Work alongside 21 nationalities across 8 countries": "Trabalhe ao lado de 21 nacionalidades em 8 países",
    "Work on projects that shape East Africa's development": "Trabalhe em projetos que moldam o desenvolvimento da África Oriental",
    "X / Twitter": "X / Twitter", "YouTube": "YouTube",
    "Your Lake Group corporate account overview, track orders, manage deliveries and access account documents.":
        "Visão geral da sua conta corporativa Lake Group: rastreie encomendas, gira entregas e aceda a documentos da conta.",
    "ZMW (Zambian Kwacha)": "ZMW (Kwacha zambiano)",
    "Zero Spillage Policy": "Política de zero derrames",
    "admin@lakeoilgroup.com": "admin@lakeoilgroup.com",
    "e.g. 50,000 litres / month, 500 MT steel": "ex. 50.000 litros / mês, 500 t de aço",
    "e.g. Dar es Salaam, Arusha, Mwanza...": "ex. Dar es Salaam, Arusha, Mwanza...",
    "e.g. LT-2024-00847": "ex. LT-2024-00847",
    "e.g. T 123 ABC": "ex. T 123 ABC",
    "eye-catching blue, white, yellow and red": "azul, branco, amarelo e vermelho vibrantes",
    "first company in Tanzania": "primeira empresa na Tanzânia",
    "media@lakeoilgroup.com": "media@lakeoilgroup.com",
    "m³ Aggregate / Month": "m³ de agregados / mês",
    "m³ aggregate monthly, supporting sustainable construction": "m³ de agregados por mês, apoiando a construção sustentável",
    "your@company.com": "asua@empresa.com",
    "••••••••": "••••••••",
    "⟲ East Africa": "⟲ África Oriental",
    "🇧🇮 Burundi": "🇧🇮 Burundi", "🇨🇩 DRC": "🇨🇩 RDC", "🇪🇹 Ethiopia": "🇪🇹 Etiópia",
    "🇰🇪 Kenya": "🇰🇪 Quénia", "🇲🇿 Mozambique": "🇲🇿 Moçambique", "🇷🇼 Rwanda": "🇷🇼 Ruanda",
    "🇹🇿 Tanzania": "🇹🇿 Tanzânia", "🇿🇲 Zambia": "🇿🇲 Zâmbia",
    "📍 Station Locator": "📍 Localizador de postos",
    "📞 Call +255 222 780 510": "📞 Ligue +255 222 780 510",
    "🛡️": "🛡️",
    "It started<br>with one tank.": "Tudo começou<br>com um único tanque.",
    "At 27 years old, Ally Edha Awadh opened a single fuel outlet in Dar es Salaam. No fleet, no network, no certainty. Just a belief that East Africa deserved a more reliable energy supply chain.":
        "Aos 27 anos, Ally Edha Awadh abriu um único posto de combustível em Dar es Salaam. Sem frota, sem rede, sem certezas. Apenas a convicção de que a África Oriental merecia uma cadeia de abastecimento energético mais fiável.",
    "Ally Edha Awadh, Founder &amp; Chairman": "Ally Edha Awadh, fundador e presidente",
    "from one truck": "de um único camião",
    "to a fleet of<br><em>700+.</em>": "para uma frota de<br><em>mais de 700.</em>",
    "Lake Trans: bulk haulage across East Africa": "Lake Trans: transporte a granel na África Oriental",
    "and along the way": "e ao longo do caminho",
    "we brought clean<br>energy <em>home.</em>": "trouxemos energia<br>limpa <em>para casa.</em>",
    "Lake Gas now supplies LPG cylinders to seven countries, displacing charcoal stoves and giving families a safer way to cook.":
        "A Lake Gas fornece agora cilindros de GLP a sete países, substituindo fogões a carvão e dando às famílias uma forma mais segura de cozinhar.",
    "eight sectors, one vision": "oito setores, uma só visão",
    "We built more than<br>a fuel company.": "Construímos mais<br>do que uma empresa de combustíveis.",
    "GCCP: Dar es Salaam's leading ready-mix concrete supplier": "GCCP: principal fornecedor de betão pronto de Dar es Salaam",
    "Every depot, every truck, every cylinder is run by people. 4,600+ of them, from 21 nationalities, across 8 countries. That's the part no spreadsheet can capture.":
        "Cada depósito, cada camião, cada cilindro é gerido por pessoas. Mais de 4.600 delas, de 21 nacionalidades, em 8 países. Essa é a parte que nenhuma folha de cálculo consegue captar.",
    "our team, our story": "a nossa equipa, a nossa história",
    "today": "hoje",
    "across <em>8 countries</em><br>and counting.": "em <em>8 países</em><br>e a continuar a crescer.",
    "Tanzania &middot; Kenya &middot; Zambia &middot; Rwanda &middot; Burundi &middot; DRC &middot; Ethiopia &middot; Mozambique":
        "Tanzânia &middot; Quénia &middot; Zâmbia &middot; Ruanda &middot; Burundi &middot; RDC &middot; Etiópia &middot; Moçambique",
    "Lake Group.": "Lake Group.",
    "Quality. Service. Safety. Professionalism.<br>Powering East &amp; Central Africa since 2006.":
        "Qualidade. Serviço. Segurança. Profissionalismo.<br>Impulsionando a África Oriental e Central desde 2006.",
    "still growing": "ainda a crescer",
    "eighteen years in": "dezoito anos depois",
    "\"From a single fuel outlet to one of East Africa's largest energy and industrial conglomerates.\"":
        "\"De um único posto de combustível a um dos maiores conglomerados de energia e industriais da África Oriental.\"",
    "&#8635; &nbsp; watch again": "&#8635; &nbsp; ver novamente",
    "tap to skip &rarr;": "toque para avançar &rarr;",
    "Next scene": "Próxima cena",
    "$850M": "850 M$",
    "100K": "100 mil",
    "18yrs": "18 anos",
    "250T/hr": "250 t/h",
    "25T/hr": "25 t/h",
    "30K": "30 mil",
    "4.6K+": "4,6 mil+",
    "600°C": "600 °C",
    "Dec 10, 2024": "10 dez. 2024",
    "Dec 12, 2024": "12 dez. 2024",
    "Dec 15, 2024": "15 dez. 2024",
    "Dec 3, 2024": "3 dez. 2024",
    "Dec 8, 2024": "8 dez. 2024",
    "Mon–Sun 5:00am – 11:00pm \xa0|\xa0 Petrol, Diesel, Lubricants": "Seg-Dom 5h00-23h00 | Gasolina, gasóleo, lubrificantes",
    "Mon–Sun 5:30am – 10:00pm \xa0|\xa0 Petrol, Diesel, LPG": "Seg-Dom 5h30-22h00 | Gasolina, gasóleo, GLP",
    "Mon–Sun 6:00am – 9:00pm \xa0|\xa0 Petrol, Diesel, Truck Diesel": "Seg-Dom 6h00-21h00 | Gasolina, gasóleo, gasóleo para camiões",
    # --- High-frequency reused strings (batch 3) ---
    "© 2026 Lake Group. <span data-i18n=\"footer.rights\">All rights reserved.</span>":
        "© 2026 Lake Group. <span data-i18n=\"footer.rights\">Todos os direitos reservados.</span>",
    "Usage:": "Utilização:", "Target:": "Público-alvo:", "Channel:": "Canal:",
    "Ongoing": "Em curso", "Operations": "Operações", "Experience": "Experiência",
    "Tracking ID": "Número de rastreio", "Your name": "O seu nome",
    "Truck Diesel": "Gasóleo para camiões", "Media Center": "Centro de media",
    "Photo Library": "Biblioteca de fotos", "Product Range": "Gama de produtos",
    "Sustainability": "Sustentabilidade", "Professionalism": "Profissionalismo",
    "Search Stations": "Pesquisar postos", "Media Enquiries": "Pedidos de media",
    "Meet Leadership": "Conheça a liderança", "Petrol & Diesel": "Gasolina e gasóleo",
    "LPG & Gas Tankers": "Camiões-cisterna de GLP e gás", "Petroleum Tankers": "Camiões-cisterna de petróleo",
    "Flatbed & Cargo Trucks": "Camiões de plataforma e carga",
    "Ready to Work Together?": "Prontos para trabalhar juntos?",
    "AFICD: Inland Container Depot": "AFICD: depósito de contentores interior",
    "Talk to our team about fuel supply, logistics, or any of our services across East Africa.":
        "Fale com a nossa equipa sobre fornecimento de combustível, logística ou qualquer um dos nossos serviços na África Oriental.",
    "All": "Todos", "New": "Novo", "Flow": "Fluxo", "Ports": "Portos",
    "Events": "Eventos", "Sports": "Desporto", "Finance": "Finanças",
    "Subject": "Assunto", "Storage": "Armazenamento", "Country": "País",
    "Heating": "Aquecimento", "Company:": "Empresa:", "Timeline": "Cronologia",
    "Password": "Palavra-passe", "Progress": "Progresso", "Order ID": "N.º de encomenda",
    "Sign Out": "Terminar sessão", "Message *": "Mensagem *",
    "Last-Mile": "Última milha", "Our Story": "A nossa história",
    "Portfolio": "Portefólio", "Formation": "Formação",
    "Our Values": "Os nossos valores", "Account #:": "Conta n.º:",
    "News Story": "Notícia", "Our People": "As nossas pessoas",
    "Need Help?": "Precisa de ajuda?", "What We Do": "O que fazemos",
    "Since 2006": "Desde 2006", "View map →": "Ver mapa →",
    "Industrial": "Industrial", "✉ Email Us": "✉ Envie-nos um e-mail",
    "Our Vision": "A nossa visão", "Our Pledge": "O nosso compromisso",
    "Translucent": "Translúcido", "Real Estate": "Imobiliário",
    "Quality": "Qualidade", "Safety": "Segurança",
    "Africa Network": "Rede africana", "Dubai, UAE": "Dubai, EAU",
    "Dar es Salaam, Tanzania": "Dar es Salaam, Tanzânia",
    "Tanzania HQ": "Sede Tanzânia", "7 Countries": "7 países", "5 Countries": "5 países",
    "1 Subsidiary": "1 subsidiária", "2 Subsidiaries": "2 subsidiárias", "3 Subsidiaries": "3 subsidiárias",
    "4 Subsidiaries": "4 subsidiárias", "5 Subsidiaries": "5 subsidiárias",
    "1 subsidiary": "1 subsidiária", "2 subsidiaries": "2 subsidiárias", "3 subsidiaries": "3 subsidiárias",
    "4 subsidiaries": "4 subsidiárias", "5 subsidiaries": "5 subsidiárias",
    "Lake Oil LDA": "Lake Oil LDA", "Lusaka, Zambia": "Lusaca, Zâmbia",
    "Nairobi, Kenya": "Nairobi, Quénia",
    "Mon–Sun 6:00am – 10:00pm \u00a0|\u00a0 Petrol, Diesel, LPG":
        "Seg-Dom 6h00-22h00 \u00a0|\u00a0 Gasolina, gasóleo, GLP",
    "<span class=\"marquee-sep\"></span>Ready-Mix Concrete": "<span class=\"marquee-sep\"></span>Betão pronto",
    "<span class=\"marquee-sep\"></span>HS-CR Steel Rebars": "<span class=\"marquee-sep\"></span>Varões de aço HS-CR",
    "<span class=\"marquee-sep\"></span>Bulk Liquid Haulage": "<span class=\"marquee-sep\"></span>Transporte de líquidos a granel",
    "<span class=\"marquee-sep\"></span>8 Countries & Growing": "<span class=\"marquee-sep\"></span>8 países e a crescer",
    "<span class=\"marquee-sep\"></span>Tanzania Headquarters": "<span class=\"marquee-sep\"></span>Sede na Tanzânia",
    "<span class=\"marquee-sep\"></span>Mozambique · Dubai UAE": "<span class=\"marquee-sep\"></span>Moçambique · Dubai EAU",
    "<span class=\"marquee-sep\"></span>Petroleum Distribution": "<span class=\"marquee-sep\"></span>Distribuição de petróleo",
    "<span class=\"marquee-sep\"></span>Kenya · Zambia · Rwanda": "<span class=\"marquee-sep\"></span>Quénia · Zâmbia · Ruanda",
    "<span class=\"marquee-sep\"></span>Container Depot Services": "<span class=\"marquee-sep\"></span>Serviços de depósito de contentores",
    "<span class=\"marquee-sep\"></span>Burundi · DRC · Ethiopia": "<span class=\"marquee-sep\"></span>Burundi · RDC · Etiópia",
    "<span class=\"marquee-sep\"></span>Lubricants Manufacturing": "<span class=\"marquee-sep\"></span>Fabrico de lubrificantes",
    "<span class=\"marquee-sep\"></span>LPG Bottling & Distribution": "<span class=\"marquee-sep\"></span>Engarrafamento e distribuição de GLP",
    "<span class=\"marquee-sep\"></span>700+ Trucks · 4,600+ Employees": "<span class=\"marquee-sep\"></span>700+ camiões · 4.600+ colaboradores",
    "<span class=\"marquee-sep\"></span>85+ Fuel Stations, Blue, White, Yellow & Red": "<span class=\"marquee-sep\"></span>85+ postos de combustível, azul, branco, amarelo e vermelho",
    "4,600+ employees": "4.600+ colaboradores", "Mar 2025": "Março de 2025", "Jan 2025": "Janeiro de 2025",
    "20 units": "20 unidades", "MT / Year": "T/ano", "700 trucks": "700 camiões",
    "39 Photos": "39 fotos",
    # --- Batch 4: short labels and UI strings ---
    "Lightweight": "Leve", "Engineering": "Engenharia",
    "Our Mission": "A nossa missão", "Recent News": "Notícias recentes",
    "GPS Tracked": "Rastreado por GPS", "Our Pillars": "Os nossos pilares",
    "Track Record": "Histórico", "Safety First": "A segurança em primeiro lugar",
    "View Gallery": "Ver galeria", "Office Hours": "Horário de funcionamento",
    "Our Services": "Os nossos serviços", "Rolling Mill": "Laminadora",
    "Total Trucks": "Total de camiões", "Cross-border": "Transfronteiriço",
    "Pending Docs": "Documentos pendentes", "Manufacturing": "Fabrico",
    "Credit Limit:": "Limite de crédito:", "Recent Orders": "Encomendas recentes",
    "QA & Dispatch": "Controlo de qualidade e expedição", "Mill Capacity": "Capacidade da laminadora",
    "ADR Compliant": "Conforme ADR", "Press & Media": "Imprensa e media",
    "Non-Corrosive": "Não corrosivo", "Non-Explosive": "Não explosivo",
    "Operations Map": "Mapa de operações", "Our Businesses": "Os nossos negócios",
    "Your full name": "O seu nome completo", "Phone Number *": "Número de telefone *",
    "Concrete Pumps": "Bombas de betão", "Our Commitment": "O nosso compromisso",
    "Our Operations": "As nossas operações", "Send Message →": "Enviar mensagem →",
    "Press Releases": "Comunicados de imprensa", "Online Enquiry": "Pedido online",
    "Tyre Inflation": "Enchimento de pneus", "Port Certified": "Certificado portuário",
    "Port Logistics": "Logística portuária", "What Drives Us": "O que nos motiva",
    "Read Our Story": "Leia a nossa história", "Request access": "Pedir acesso",
    "Send a Message": "Enviar mensagem", "Partner With Us": "Seja nosso parceiro",
    "Up to 40 tonnes": "Até 40 toneladas",
    "Our Story": "A nossa história",
    "GCCP Facility": "Instalação GCCP", "Cross-border corridors": "Corredores transfronteiriços",
    "Press releases, company announcements and media resources from Lake Group.":
        "Comunicados de imprensa, anúncios da empresa e recursos de media do Lake Group.",
    # --- Homepage (index.html) batch ---
    "From Drop to <span>LAKE OIL</span>": "Da gota à <span>LAKE OIL</span>",
    "<strong>Formation</strong>Precision-refined fuel, ready for distribution.":
        "<strong>Formação</strong>Combustível refinado com precisão, pronto para distribuição.",
    "<strong>Flow</strong>Bulk haulage through 700+ Lake Trans trucks.":
        "<strong>Fluxo</strong>Transporte a granel por mais de 700 camiões Lake Trans.",
    "<strong>Storage</strong>LAKE OIL terminals filling across 8 countries.":
        "<strong>Armazenamento</strong>Enchimento dos terminais LAKE OIL em 8 países.",
    "Fueling <span>Progress</span>": "Impulsionando o <span>progresso</span>",
    "Founded by CEO & Chairman <strong>Ally Edha Awadh</strong> in 2006 at just 27 years old, Lake Group has grown from a single fuel outlet into one of East and Central Africa's largest energy, logistics and industrial conglomerates.":
        "Fundado pelo CEO e Presidente <strong>Ally Edha Awadh</strong> em 2006, com apenas 27 anos, o Lake Group cresceu de um único posto de combustível para um dos maiores conglomerados de energia, logística e industriais da África Oriental e Central.",
    "Today, with <strong>4,600+ employees</strong> across 21 nationalities, 700+ trucks, 85+ fuel stations and 20+ subsidiaries, Lake Group powers everyday life across Tanzania, Kenya, Zambia, Rwanda, Burundi, DRC, Ethiopia and Mozambique.":
        "Hoje, com mais de <strong>4.600 colaboradores</strong> de 21 nacionalidades, mais de 700 camiões, mais de 85 postos de combustível e mais de 20 subsidiárias, o Lake Group impulsiona o dia a dia na Tanzânia, Quénia, Zâmbia, Ruanda, Burundi, RDC, Etiópia e Moçambique.",
    "Trucks in Fleet": "Camiões na frota",
    "Top 5 petroleum distributor in Tanzania. Retail stations, bulk supply and storage across 8 countries.":
        "Top 5 dos distribuidores de petróleo na Tanzânia. Postos de venda, fornecimento a granel e armazenamento em 8 países.",
    "Lake Gas operates LPG bottling and distribution with cylinders for domestic and commercial use across 7 countries.":
        "A Lake Gas opera o engarrafamento e distribuição de GLP com cilindros para uso doméstico e comercial em 7 países.",
    "Lake Trans operates 700+ trucks for bulk liquid haulage and regional logistics across East & Central Africa.":
        "A Lake Trans opera mais de 700 camiões para transporte de líquidos a granel e logística regional na África Oriental e Central.",
    "GCCP, Dar es Salaam's leading ready-mix concrete supplier. 30,000 m³ aggregate monthly from our Lugoba quarry.":
        "GCCP, o principal fornecedor de betão pronto de Dar es Salaam. 30.000 m³ de agregados mensais da nossa pedreira de Lugoba.",
    "Lake Lubes manufactures and distributes high-quality automotive, industrial and marine lubricants in 5 countries.":
        "A Lake Lubes fabrica e distribui lubrificantes automóveis, industriais e marítimos de alta qualidade em 5 países.",
    "Tanzania's first HS-CR rebar producer. Fully automated rolling mill, 100,000 MT/year capacity.":
        "O primeiro produtor de varões HS-CR da Tanzânia. Laminadora totalmente automatizada, capacidade de 100.000 t/ano.",
    "AFICD & ACFS provide inland container depot and freight station services across TZ, ZM and MZ.":
        "AFICD e ACFS fornecem serviços de depósito de contentores interior e estação de frete na Tanzânia, Zâmbia e Moçambique.",
    "Operations across Tanzania, Kenya, Zambia, Rwanda, Burundi, DRC, Ethiopia, Mozambique & Dubai.":
        "Operações na Tanzânia, Quénia, Zâmbia, Ruanda, Burundi, RDC, Etiópia, Moçambique e Dubai.",
    "See Lake Group in Action": "Veja o Lake Group em ação",
    "View Full Gallery": "Ver galeria completa",
    "Message from the CEO": "Mensagem do CEO",
    "\"Welcome to a diverse pioneer in fuel marketing, haulage, LPG bottling, cylinder manufacturing and concrete production. With experienced engineers and business professionals across our divisions, we are fully geared to meet the demands of the global marketplace.\"":
        "\"Bem-vindo a um pioneiro diversificado na comercialização de combustíveis, transporte, engarrafamento de GLP, fabrico de cilindros e produção de betão. Com engenheiros experientes e profissionais de negócios em todas as nossas divisões, estamos totalmente preparados para responder às exigências do mercado global.\"",
    "CEO & Chairman, Lake Group \u00a0|\u00a0 Founded Lake Group at age 27 in 2006":
        "CEO e Presidente, Lake Group \u00a0|\u00a0 Fundou o Lake Group aos 27 anos em 2006",
    # --- fuel.html ---
    "One of Tanzania's top 5 petroleum distributors, supplying quality fuel across 8 countries in East and Central Africa.":
        "Um dos 5 maiores distribuidores de petróleo da Tanzânia, fornecendo combustível de qualidade em 8 países da África Oriental e Central.",
    "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Retail fuel stations, 85+ across Tanzania and the region":
        "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Mais de 85 postos de combustível na Tanzânia e na região",
    "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Bulk petroleum supply for corporate and government clients":
        "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Fornecimento de petróleo a granel para clientes corporativos e governamentais",
    "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Own oil storage facilities in Tanzania, Kenya, Burundi and DRC":
        "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Instalações de armazenamento próprias na Tanzânia, Quénia, Burundi e RDC",
    "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Competitive pricing backed by regional supply chain scale":
        "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Preços competitivos apoiados pela escala da cadeia de fornecimento regional",
    "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Quality products meeting national and international standards":
        "<span style=\"color:var(--amber);font-weight:700\">\u2713</span>Produtos de qualidade que cumprem normas nacionais e internacionais",
    "Wadi Elsundus Petroleum": "Wadi Elsundus Petroleum",
    "\ud83d\udccd Station Locator": "\ud83d\udccd Localizador de postos",
    # --- services.html ---
    "Our Services & Divisions": "Os nossos serviços e divisões",
    "One Integrated Vision": "Uma visão integrada",
    "Lake Group operates across the full energy and industrial value chain of East and Central Africa.":
        "O Lake Group opera em toda a cadeia de valor energética e industrial da África Oriental e Central.",
    "Top 5 petroleum distributor in Tanzania. 85+ retail stations, bulk petroleum supply and storage.":
        "Top 5 dos distribuidores de petróleo na Tanzânia. Mais de 85 postos de venda, fornecimento e armazenamento de petróleo a granel.",
    "Lake Gas LPG bottling and distribution. 6kg, 10kg, 15kg and 38kg cylinders for domestic and commercial use across 7 countries.":
        "Engarrafamento e distribuição de GLP pela Lake Gas. Cilindros de 6kg, 10kg, 15kg e 38kg para uso doméstico e comercial em 7 países.",
    "Lake Trans operates 700+ trucks for bulk liquid haulage and general cargo across East & Central Africa.":
        "A Lake Trans opera mais de 700 camiões para transporte de líquidos a granel e carga geral na África Oriental e Central.",
    "GCCP, Dar es Salaam's leading ready-mix concrete supplier. 30,000 m\u00b3 aggregate monthly.":
        "GCCP, o principal fornecedor de betão pronto de Dar es Salaam. 30.000 m³ de agregados mensais.",
    "Lake Lubes manufactures and distributes automotive, industrial and marine lubricants in 5 countries.":
        "A Lake Lubes fabrica e distribui lubrificantes automóveis, industriais e marítimos em 5 países.",
    "Tanzania's first HS-CR rebar producer. 100,000 MT/year rolling mill capacity.":
        "O primeiro produtor de varões HS-CR da Tanzânia. Capacidade da laminadora de 100.000 t/ano.",
    "AFICD & ACFS inland container depot and freight station services across TZ, ZM and MZ.":
        "Serviços de depósito de contentores interior e estação de frete AFICD e ACFS na Tanzânia, Zâmbia e Moçambique.",
    "Operations across 8 countries plus Dubai. Interactive map of all Lake Group facilities.":
        "Operações em 8 países, além de Dubai. Mapa interativo de todas as instalações do Lake Group.",
    "8 Countries + Dubai": "8 países + Dubai",
    "Explore the map \u2192": "Explorar o mapa \u2192",
    # --- about.html ---
    "One of East and Central Africa's fastest growing energy trading and transportation conglomerates, founded 2006.":
        "Um dos conglomerados de comércio de energia e transporte que mais cresce na África Oriental e Central, fundado em 2006.",
    "Lake Group was established by its founding CEO and Chairman <strong>Mr. Ally Edha Awadh</strong> in 2006 with the opening of its flagship company, Lake Oil: a humble beginning in Dar es Salaam, Tanzania.":
        "O Lake Group foi fundado pelo seu CEO e Presidente fundador <strong>Sr. Ally Edha Awadh</strong> em 2006, com a abertura da sua empresa principal, a Lake Oil: um início modesto em Dar es Salaam, Tanzânia.",
    "Mr. Ally Edha Awadh": "Sr. Ally Edha Awadh",
    "Since inception, the growth story of Lake Group has been vertical, becoming one of the fastest-growing energy trading, logistics and construction supply material conglomerates in East and Central Africa and the Middle East.":
        "Desde a sua fundação, a história de crescimento do Lake Group tem sido vertical, tornando-se um dos conglomerados de comércio de energia, logística e materiais de construção que mais cresce na África Oriental e Central e no Médio Oriente.",
    "Today, Lake Group distributes petroleum products in 8 countries, owns storage facilities across the region, manufactures lubricants and ready-mix concrete, and operates a fleet of more than <strong>700 trucks</strong>.":
        "Hoje, o Lake Group distribui produtos petrolíferos em 8 países, possui instalações de armazenamento em toda a região, fabrica lubrificantes e betão pronto, e opera uma frota com mais de <strong>700 camiões</strong>.",
    "With a diverse mix of <strong>21 nationalities</strong> and a total workforce of <strong>4,600+ employees</strong>, Lake Group continues to grow with purpose.":
        "Com uma mistura diversificada de <strong>21 nacionalidades</strong> e uma força de trabalho total de mais de <strong>4.600 colaboradores</strong>, o Lake Group continua a crescer com propósito.",
    "21 nationalities": "21 nacionalidades",
    "Our Full History": "A nossa história completa",
    "To provide customers with quality products and services in a safe, efficient and cost-effective manner without damaging the environment, identifying and entering new areas of business while creating a work environment where employees exceed their personal best.":
        "Fornecer aos clientes produtos e serviços de qualidade de forma segura, eficiente e económica, sem prejudicar o ambiente, identificando e entrando em novas áreas de negócio enquanto se cria um ambiente de trabalho onde os colaboradores superam os seus limites pessoais.",
    "Teamwork, Reliability, Integrity": "Trabalho de equipa, fiabilidade, integridade",
    "Where We're Going": "Para onde vamos",
    "To become the leading regional convenience retailer and marketer of products and services while achieving continuous improvement through operational excellence, innovation and a culture based on performance.":
        "Tornar-se o principal retalhista e comercializador regional de produtos e serviços de conveniência, alcançando uma melhoria contínua através da excelência operacional, inovação e uma cultura baseada no desempenho.",
    "No compromise on quality": "Sem compromissos na qualidade",
    "Safety is first always": "A segurança vem sempre primeiro",
    "\"Welcome to a diverse pioneer in fuel marketing, haulage, LPG bottling, cylinder manufacturing and concrete production. With our experienced team across all business units, we are fully geared to meet the demands of the global marketplace.\"":
        "\"Bem-vindo a um pioneiro diversificado na comercialização de combustíveis, transporte, engarrafamento de GLP, fabrico de cilindros e produção de betão. Com a nossa equipa experiente em todas as unidades de negócio, estamos totalmente preparados para responder às exigências do mercado global.\"",
    "Under Mr. Awadh's leadership, Lake Group has successfully established itself in Oil & Gas, Engineering, Industrial Supplies, Projects, Cargo, Distribution, General Trading, Storage, Concrete Solutions and the Construction Sector, building a high-credit-rated organisation over nearly two decades.":
        "Sob a liderança do Sr. Awadh, o Lake Group estabeleceu-se com sucesso nos setores de petróleo e gás, engenharia, fornecimentos industriais, projetos, carga, distribuição, comércio geral, armazenamento, soluções de betão e construção, construindo uma organização com elevada classificação de crédito ao longo de quase duas décadas.",
    # --- contact.html ---
    "Reach our team for enquiries, partnerships, quotes or any information about Lake Group and its subsidiaries.":
        "Contacte a nossa equipa para pedidos, parcerias, orçamentos ou qualquer informação sobre o Lake Group e as suas subsidiárias.",
    "We're Happy to Hear From You": "Temos todo o gosto em ouvi-lo",
    "Plot 49, Mikocheni Light Industrial Area": "Plot 49, Mikocheni Light Industrial Area",
    "P.O.BOX 5055, Dar es Salaam, Tanzania": "C.P. 5055, Dar es Salaam, Tanzânia",
    "Monday \u2013 Friday": "Segunda - Sexta",
    "9:00 AM \u2013 6:00 PM EAT": "9h00 - 18h00 (hora da África Oriental)",
    "Mikocheni, Dar es Salaam, Tanzania": "Mikocheni, Dar es Salaam, Tanzânia",
    "Coordinates: -6.762806, 39.241447": "Coordenadas: -6,762806, 39,241447",
    "Open in Google Maps": "Abrir no Google Maps",
    "your@email.com": "oseu@email.com",
    "Tell us what you need...": "Diga-nos o que precisa...",
}
