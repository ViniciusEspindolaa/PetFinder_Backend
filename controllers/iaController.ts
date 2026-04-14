import { Request, Response } from 'express';
import vision from '@google-cloud/vision';

// Configuração do Google Vision para Suportar Vercel (Serverless) ou Local
let clientOptions: any = {};

if (process.env.GOOGLE_CREDENTIALS_JSON) {
  try {
    // Na Vercel, vamos ler as credenciais diretamente do texto JSON
    clientOptions.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  } catch (error) {
    console.error('Erro ao fazer parse do GOOGLE_CREDENTIALS_JSON:', error);
  }
}

// Cria um cliente do Google Vision (Se não tiver `credentials`, ele cai pro fallback automático de ler o arquivo apontado em GOOGLE_APPLICATION_CREDENTIALS do .env)
const client = new vision.ImageAnnotatorClient(clientOptions);

export const analyzePetImage = async (req: Request, res: Response) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'Nenhuma imagem foi enviada.' });
    }

    // 1. Envia o buffer da imagem para o Google Cloud Vision
    console.log('Enviando imagem para análise no Google Cloud Vision...');
    const [result] = await client.annotateImage({
      image: { content: new Uint8Array(req.file.buffer) },
      features: [{ type: 'LABEL_DETECTION' }, { type: 'WEB_DETECTION' }]
    });

    const labelsRaw = result.labelAnnotations || [];
    const webEntitiesRaw = result.webDetection?.webEntities || [];
    
    // Lista apenas as descrições em inglês dos labels
    const labels = labelsRaw.map(label => (label.description || '').toLowerCase());
    const webEntities = webEntitiesRaw.map(entity => (entity.description || '').toLowerCase());
    
    const allDescriptors = [...labels, ...webEntities];
    console.log('Descritores encontrados:', allDescriptors);

    if (allDescriptors.length === 0) {
      throw new Error('Nenhum rótulo encontrado.');
    }

    // 2. Lógica para extrair as informações
    let type = 'other';
    let breed = 'Desconhecida';
    let size = 'medium';
    
    // Identifica Espécie
    if (allDescriptors.slice(0, 10).some(l => /\b(dog|puppy|canine)\b/.test(l))) {
      type = 'dog';
    } else if (allDescriptors.slice(0, 10).some(l => /\b(cat|kitten|feline)\b/.test(l))) {
      type = 'cat';
    }

    // Palavras genéricas para ignorar ao procurar raça
    const exactGenericTerms = [
      'dog', 'cat', 'mammal', 'vertebrate', 'canidae', 'felidae', 'felinae', 'carnivore', 'carnivores', 
      'snout', 'whiskers', 'companion animal', 'fawn', 'pet', 'animal', 'puppy', 'kitten', 
      'nose', 'eye', 'fur', 'collar', 'leash', 'breed', 'dog breed', 'carnivoran', 'non-sporting group',
      'sporting group', 'working group', 'toy dog', 'hound', 'hound group', 'street dog', 'grass', 'floor',
      'working dog', 'guard dog', 'companion dog', 'livestock guardian dog', 'terrier', 'mixed breed', 'cur',
      'rare breed', 'dog collar', 'ancient dog breeds', 'small to medium-sized cats', 'feline', 'cats',
      'domestic short-haired cat', 'domestic long-haired cat', 'tabby cat', 'tabby', 'bicolor cat', 
      'european shorthair', 'american shorthair', 'asian', 'polydactyl cat', 'dragon li',
      'lawn', 'yard', 'plant', 'tree', 'black cat', 'white cat', 'black dog', 'white dog', 'puppy', 'kitten',
      'black', 'white', 'brown', 'orange', 'grey', 'gray', 'golden', 'ojos azules', 'malayan cat', 'aegean cat',
      'cyprus cat', 'arabian mau', 'khao manee', 'asian semi-longhair', 'colorpoint shorthair', 'moggy', 'calico cat', 'tortoiseshell cat',
      'bird', 'birds', 'avian', 'waterfowl', 'fowl', 'poultry'
    ];

    // Ignora descritores que apenas descrevam partes do corpo, acessórios ou cores
    const ignoreIfContains = [
      'collar', 'leash', 'harness', 'tag', 'snout', 'whiskers', 'nose', 'eye', 'paw', 'fur', 'hair', 'breed', 'group', 'animal',
      'black', 'white', 'brown', 'orange', 'grey', 'gray', 'golden', 'ojos azules', 'malayan'
    ];

    // Dicionário de tradução para as raças mais comuns (evita termos em inglês)
    const breedTranslations: { [key: string]: string } = {
      // Cães
      'german shepherd': 'Pastor Alemão', 'german shepherd dog': 'Pastor Alemão',
      'golden retriever': 'Golden Retriever', 'labrador retriever': 'Labrador',
      'french bulldog': 'Bulldog Francês', 'english bulldog': 'Bulldog Inglês', 'bulldog': 'Bulldog',
      'poodle': 'Poodle', 'toy poodle': 'Poodle', 'miniature poodle': 'Poodle', 'standard poodle': 'Poodle',
      'beagle': 'Beagle', 'rottweiler': 'Rottweiler', 'yorkshire terrier': 'Yorkshire',
      'yorkshire': 'Yorkshire', 'boxer': 'Boxer', 'dachshund': 'Dachshund', 'pug': 'Pug',
      'shih tzu': 'Shih Tzu', 'chihuahua': 'Chihuahua', 'siberian husky': 'Husky Siberiano', 'husky': 'Husky Siberiano',
      'pomeranian': 'Lulu da Pomerânia', 'maltese': 'Maltês', 'maltese dog': 'Maltês',
      'dobermann': 'Dobermann', 'doberman': 'Dobermann', 'doberman pinscher': 'Dobermann',
      'pit bull': 'Pitbull', 'pitbull': 'Pitbull', 'american pit bull terrier': 'Pitbull',
      'staffordshire bull terrier': 'Pitbull', 'american staffordshire terrier': 'Pitbull',
      'border collie': 'Border Collie', 'great dane': 'Dogue Alemão', 'schnauzer': 'Schnauzer',
      'chow chow': 'Chow Chow', 'cocker spaniel': 'Cocker Spaniel', 'english cocker spaniel': 'Cocker Spaniel',
      'american cocker spaniel': 'Cocker Spaniel', 'bichon frise': 'Bichon Frisé', 'akita': 'Akita',
      'shiba inu': 'Shiba Inu', 'cane corso': 'Cane Corso', 'bull terrier': 'Bull Terrier',
      'belgian shepherd': 'Pastor Belga', 'malinois': 'Pastor Belga Malinois', 'dalmatian': 'Dálmata',
      'basset hound': 'Basset', 'pekingese': 'Pequinês', 'lhasa apso': 'Lhasa Apso',
      'bernese mountain dog': 'Boiadeiro Bernês', 'bernese': 'Boiadeiro Bernês', 'australian shepherd': 'Pastor Australiano',
      // Gatos
      'siamese cat': 'Siamês', 'siamese': 'Siamês', 'persian cat': 'Persa', 'persian': 'Persa',
      'maine coon': 'Maine Coon', 'sphynx': 'Sphynx', 'sphynx cat': 'Sphynx',
      'bengal': 'Bengal', 'bengal cat': 'Bengal', 'ragdoll': 'Ragdoll',
      'british shorthair': 'British Shorthair', 'scottish fold': 'Scottish Fold',
      'russian blue': 'Azul Russo', 'abyssinian': 'Abissínio', 'abyssinian cat': 'Abissínio',
      'nebelung': 'Nebelung',
      // Outros animais / Exóticos
      'horse': 'Cavalo', 'pony': 'Pônei', 'bird': 'Ave', 'parrot': 'Papagaio', 'macaw': 'Arara', 
      'cockatoo': 'Cacatua', 'turtle': 'Tartaruga', 'tortoise': 'Tartaruga', 'rabbit': 'Coelho', 
      'bunny': 'Coelho', 'guinea pig': 'Porquinho da Índia', 'hamster': 'Hamster', 'ferret': 'Furão', 
      'pig': 'Porco', 'cow': 'Vaca', 'sheep': 'Ovelha', 'goat': 'Cabra', 'monkey': 'Macaco', 
      'marmoset': 'Sagui', 'snake': 'Cobra', 'lizard': 'Lagarto', 'iguana': 'Iguana', 'chicken': 'Galinha',
      'duck': 'Pato', 'goose': 'Ganso', 'pigeon': 'Pombo', 'dove': 'Pombo', 'cockatiel': 'Calopsita',
      'parakeet': 'Periquito', 'budgerigar': 'Periquito'
    };

    // Filtra preferencialmente as raças, ignorando acessórios (como "dog collar")
    const potentialBreeds = allDescriptors.filter(label => {
      const lower = label.toLowerCase();
      if (lower.length <= 2) return false;
      if (exactGenericTerms.includes(lower)) return false;
      if (ignoreIfContains.some(ignore => lower.includes(ignore))) return false;
      return true;
    });

    if (potentialBreeds.length > 0) {
      // Diferente de pegar só o "topBreed", vamos checar os primeiros 5 descritores pra ver se uma raça mapeada aparece.
      // Às vezes o Google bota "dog collar" em 1º, "snout" em 2º, e "German Shepherd" só em 3º.
      let foundBreedKey: string | null = null;
      let foundSrdFirst = false;

      // Termos que indicam fortemente que o cachorro é um vira-lata (SRD) e deveriam anular raças de baixo nível
      const srdTerms = ['street dog', 'mixed breed', 'cur', 'potcake dog', 'pariah dog', 'carolina dog', 'indian pariah dog', 'mongrel', 'mutt', 'crossbreed', 'feral dog', 'dingo', 'new guinea singing dog', 'aidi', 'fauve de bretagne'];

      // Vamos checar os 20 primeiros descritores *brutos* (allDescriptors) para ver se ele apontou que é vira-lata.
      for (let i = 0; i < Math.min(allDescriptors.length, 20); i++) {
        const desc = allDescriptors[i].toLowerCase();
        if (srdTerms.includes(desc)) {
          foundSrdFirst = true;
          break; // Confirmou que a foto cheira a vira-lata nas maiores confianças
        }
      }

      // Além disso, se a IA jogar "Chihuahua" ou "Pinscher" mas não colocar isso no TOP 2 descritores brutos,
      // e for um filhote, é muito provável que seja apenas um SRD filhote.
      if (!foundSrdFirst) {
         let isPuppy = allDescriptors.slice(0, 15).some(d => d.toLowerCase().includes('puppy'));
         let top3 = allDescriptors.slice(0, 3).map(d => d.toLowerCase());
         if (isPuppy && !top3.includes('chihuahua') && !top3.includes('pinscher')) {
             // Se for filhote, e a IA não gritou Chihuahua no topo absoluto,
             // vamos desconfiar muito do rótulo de Chihuahua lá no meio
             const hasChihuahua = potentialBreeds.slice(0, 3).some(d => d.toLowerCase() === 'chihuahua');
             if (hasChihuahua) foundSrdFirst = true;
         }
      }

      if (!foundSrdFirst) {
        for (let i = 0; i < Math.min(potentialBreeds.length, 7); i++) {
          const currentLower = potentialBreeds[i].toLowerCase();
          
          // Heurística do Dobermann escondido pelo Pinscher
          if (currentLower.includes('pinscher') && potentialBreeds.slice(0, 5).some(d => d.includes('doberman'))) {
             foundBreedKey = 'dobermann';
             break;
          }

          if (breedTranslations[currentLower]) {
             foundBreedKey = currentLower;
             break;
          }
        }
      }

      if (foundBreedKey && !foundSrdFirst) {
        breed = breedTranslations[foundBreedKey];
      } else {
        // Se o Google gritou que é Mixed Breed de cara, ou não achou raça em 7 tentativas, vira SRD
        if (type === 'other') {
           if (allDescriptors.some(d => d.toLowerCase() === 'bird' || d.toLowerCase() === 'birds' || d.toLowerCase() === 'avian')) {
               breed = 'Ave';
           } else {
               breed = 'Desconhecida';
           }
        } else {
           breed = 'SRD (Vira-lata)';
        }
      }      const breedLower = breed.toLowerCase();
      // Ajustes comuns do Google Vision:
      if (breedLower.includes('retriever') || breedLower.includes('shepherd') || breedLower.includes('husky') || breedLower.includes('mastiff') || breedLower.includes('dobermann') || breedLower.includes('pit bull') || breedLower.includes('great dane') || breedLower.includes('rottweiler') || breedLower.includes('akita')) {
        size = 'large';
      } else if (breedLower.includes('chihuahua') || breedLower.includes('pomeranian') || breedLower.includes('pinscher') || breedLower.includes('pug') || breedLower.includes('shih tzu') || breedLower.includes('yorkshire')) {
        size = 'small';
        // Se confundiu Dobermann filhote com Pinscher médio: (ajuste heurístico básico)
        if (breedLower.includes('pinscher') && labels.includes('puppy')) size = 'small'; 
      }
    } else if (type !== 'other') {
      breed = 'SRD (Vira-lata)';
    }

    // Dicionário de tradução para características flexíveis
    const colorMap: { [key: string]: string } = {
      'black': 'preto', 'white': 'branco', 'brown': 'marrom', 'golden': 'dourado', 
      'orange': 'laranja', 'ginger': 'laranja', 'grey': 'cinza', 'gray': 'cinza',
      'yellow': 'amarelo', 'calico': 'tricolor', 'tortoiseshell': 'escaminha (três cores)',
      'tabby': 'tigrado', 'tuxedo': 'frajola (preto e branco)', 'bicolor': 'bicolor',
      'striped': 'listrado', 'fawn': 'bege', 'cream': 'creme', 'beige': 'bege', 'red': 'laranja', 'peach': 'pêssego',
      'chestnut': 'marrom', 'bay': 'marrom', 'sorrel': 'marrom', 'roan': 'mesclado', 'dun': 'caramelo', 'palomino': 'dourado', 'pinto': 'malhado',
      'equine': '', 'draft horse': '', 'stallion': '', 'mare': '', 'foal': '',
      'branco': 'branco', 'preto': 'preto', 'marrom': 'marrom', 'cinza': 'cinza', 'amarelo': 'amarelo', 'dourado': 'dourado', 'bege': 'bege', 'creme': 'creme'
    };

    const traitMap: { [key: string]: string } = {
      'collar': 'usando coleira', 'leash': 'com guia', 'sleeping': 'dormindo', 'sitting': 'sentado',
      'running': 'correndo', 'playing': 'brincando', 'long hair': 'de pelo longo', 
      'short hair': 'de pelo curto', 'fluffy': 'peludo', 'injured': 'machucado', 'thin': 'magro'
    };

    // As top tags do Google costumam ter maior precisão de cores reais, as do final são palpites da IA pra componentes de fundo ou sombras.
    // Vamos olhar para cores nas próximas 75 tags, garantindo que pega cores mais de nicho (ex: cavalos, aves).
    const topDescriptors = allDescriptors.slice(0, 75);
    
    // Heurísticas de cor de gatos
    const foundColors = new Set<string>();
    const foundTraits = new Set<string>();

    topDescriptors.forEach(desc => {
      const lower = desc.toLowerCase();
      
      // Busca cores baseadas nas chaves
      for (const [eng, pt] of Object.entries(colorMap)) {
        if (new RegExp(`(?:^|\\W)${eng}(?:\\W|$)`).test(lower)) {
            foundColors.add(pt);
        }
      }
      
      // Busca características
      for (const [eng, pt] of Object.entries(traitMap)) {
        if (new RegExp(`(?:^|\\W)${eng}(?:\\W|$)`).test(lower)) {
            foundTraits.add(pt);
        }
      }
    });

    // Heurísticas de cor de gatos
    if (type === 'cat') {
      // Gato Laranja e Gato Tigrado
      // Foca em cores fortes e varre os descritores mais a fundo (até 50), mas restringe escopo de cores escuras para evitar fundos/sombras
      const hasOrangeLabels = allDescriptors.slice(0, 50).some(d => ['ginger', 'orange', 'yellow', 'red', 'fawn', 'gold', 'peach', 'apricot', 'marmalade'].some(clr => d.includes(clr)));
      const hasStrictDarkLabels = allDescriptors.slice(0, 15).some(d => ['black', 'grey'].some(clr => d.includes(clr))); 
      
      const isTabby = foundColors.has('tigrado') || allDescriptors.some(d => d.includes('tabby'));

      if (isTabby) {
        if (hasOrangeLabels && !hasStrictDarkLabels) {
          // É clara/notoriamente um gato tigrado laranja
          foundColors.add('tigrado laranja');
          foundColors.delete('laranja');
          foundColors.delete('tigrado');
          foundColors.delete('marrom');
        } else if (hasStrictDarkLabels) {
          // É um gato tigrado comum (marrom/cinza)
          foundColors.add('tigrado');
          foundColors.delete('laranja');
          foundColors.delete('tigrado laranja');
          if (!foundColors.has('marrom') && !foundColors.has('cinza') && !foundColors.has('preto')) {
            foundColors.add('marrom'); // Cor base comum para tigrados
          }
        } else {
           // Se for duvidoso mas tiver labels laranjas
           if (hasOrangeLabels || foundColors.has('laranja')) {
             foundColors.add('tigrado laranja');
             foundColors.delete('laranja');
             foundColors.delete('tigrado');
             foundColors.delete('marrom');
           }
        }
      } else if (hasOrangeLabels) {
        foundColors.add('laranja');
      }

      // Prevenção extra: se em algum cenário o laranja e tigrado sobreviverem juntos no final
      if (foundColors.has('laranja') && foundColors.has('tigrado')) {
        foundColors.add('tigrado laranja');
        foundColors.delete('laranja');
        foundColors.delete('tigrado');
      }

      // Adicionar segurança para Persa (geralmente branco, cinza, bege/creme)
      // Ajustado condition para checar "foundColors.size === 0" && garantindo que é string "Persa"
      if (breed.toLowerCase().includes('persa') && foundColors.size === 0) {
        // Busca ativa de cores de persa nos descritores totais
        const hasWhite = allDescriptors.some(d => d.includes('white') || d.includes('snow'));
        const hasGrey = allDescriptors.some(d => d.includes('grey') || d.includes('silver') || d.includes('smoke'));
        const hasCream = allDescriptors.some(d => d.includes('cream') || d.includes('beige') || d.includes('fawn') || d.includes('peach') || d.includes('orange') || d.includes('ginger') || d.includes('yellow') || d.includes('red'));
        const hasBlack = allDescriptors.some(d => d.includes('black') || d.includes('dark'));
        
        if (hasWhite) foundColors.add('branco');
        if (hasGrey) foundColors.add('cinza');
        // Se pegou tag laranja, devolve laranja pro persa também
        if (hasCream) {
          if (allDescriptors.some(d => d.includes('orange') || d.includes('ginger') || d.includes('red') || d.includes('yellow'))) {
             foundColors.add('laranja');
          } else {
             foundColors.add('creme');
          }
        }
        if (hasBlack) foundColors.add('preto');
      }

      // Gatas Tricolores/Calico: Limpa as cores soltas e os bicolores pra não virar bagunça
      const isTricolor = foundColors.has('tricolor') || foundColors.has('escaminha (três cores)') || allDescriptors.slice(0, 25).some(d => d.includes('calico') || d.includes('tortoiseshell'));
      if (isTricolor) {
          foundColors.clear();
          foundColors.add(allDescriptors.some(d => d.includes('tortoiseshell')) ? 'escaminha (três cores)' : 'tricolor');
      } 
      // Frajola
      else {
          const isBlackAndWhite = foundColors.has('preto') && foundColors.has('branco');
          const hasTuxedo = allDescriptors.slice(0, 25).some(d => d.includes('tuxedo') || d.includes('bicolor') || d.includes('tuxedo cat'));
          
          if (isBlackAndWhite || hasTuxedo) {
              foundColors.delete('preto');
              foundColors.delete('branco');
              foundColors.delete('bicolor');
              foundColors.add('frajola (preto e branco)');
          }

          // Pretos iluminados (sol/sombra)
          if (foundColors.has('preto') && foundColors.has('marrom')) {
             let blackIndex = allDescriptors.findIndex(d => d.includes('black'));
             let brownIndex = allDescriptors.findIndex(d => d.includes('brown'));
             if (blackIndex !== -1 && brownIndex !== -1 && blackIndex < brownIndex) {
                 foundColors.delete('marrom');
             }
          }
      }
    } else if (type === 'other') {
      // Fallback para animais exóticos onde a cor não esteja clara nas tags iniciais
      if (foundColors.size === 0 || Array.from(foundColors).every(c => c.trim() === '')) {
        const fullLabels = allDescriptors.join(' ').toLowerCase();
        if (fullLabels.includes('white') || fullLabels.includes('snow') || fullLabels.includes('gray') || fullLabels.includes('grey') || fullLabels.includes('lipizzan') || fullLabels.includes('camargue') || fullLabels.includes('branco') || fullLabels.includes('silver') || fullLabels.includes('albino')) {
            foundColors.clear();
            foundColors.add('branco');
        } else if (fullLabels.includes('black') || fullLabels.includes('dark') || fullLabels.includes('preto')) {
            foundColors.clear();
            foundColors.add('preto');
        } else if (fullLabels.includes('brown') || fullLabels.includes('chestnut') || fullLabels.includes('bay') || fullLabels.includes('sorrel') || fullLabels.includes('marrom')) {
            foundColors.clear();
            foundColors.add('marrom');
        }
      }
    }

    // Filhote só é considerado se as palavras puppy/kitten vierem no começo (alta confiança)
    const isFilhote = allDescriptors.slice(0, 15).some(d => d.includes('puppy') || d.includes('kitten'));
    if (isFilhote) {
      foundTraits.delete('filhote'); // Remove de traços porque já será formatado na string
    }

    const colors = Array.from(foundColors).filter(c => c.trim() !== '');
    const otherTraits = Array.from(foundTraits).filter(t => t.trim() !== '');

    let especieTxt = type === 'dog' ? 'Cachorro' : type === 'cat' ? 'Gato' : 'Animal';
    let racaTxt = (breed && breed !== 'SRD (Vira-lata)' && breed !== 'Desconhecida') ? ` da raça ${breed}` : (type === 'other' ? '' : ' sem raça definida');

    // Se for "other" (como cavalo, cacatua, etc)
    if (type === 'other' && breed && breed !== 'Desconhecida' && breed !== 'SRD (Vira-lata)') {
        especieTxt = breed; // Define "Cavalo", "Cacatua", etc no começo.
        racaTxt = '';       // Zera a raça para não repetir (ex: não ficar "Cavalo Cavalo").
    }

    const corTxt = colors.length > 0 ? ` ${colors.join(' e ')}` : '';
    const filhoteTxt = isFilhote ? ' filhote' : '';

    let description = `${especieTxt}${racaTxt}${corTxt}${filhoteTxt}`;    if (otherTraits.length > 0) {
      description += `, ${otherTraits.join(', ')}`;
    }
    
    description += '.\n\nPor favor, confira e complemente esta descrição com mais detalhes que possam ajudar na identificação.';
    description += '\n\n(Aviso: Os campos e esta descrição inicial foram sugeridos por Inteligência Artificial e podem conter imprecisões).';

    const finalData = {
      type,
      breed,
      size,
      description
    };

    return res.status(200).json(finalData);

  } catch (error: any) {
    console.error('Erro no Google Vision analyzePetImage:', error.message);
    return res.status(500).json({ message: "Erro ao analisar imagem com IA." });
  }
};
