import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getCombinedScore } from '../../lib/scoring'

const MATCH_WEIGHTS = {
  skills: { keywords: 60, experience: 20, sector: 15, location: 5 },
  experience: { keywords: 30, experience: 50, sector: 15, location: 5 },
  location: { keywords: 30, experience: 20, sector: 15, location: 35 }
}

const SYNONYMS: Record<string, string[]> = {

  // SALES & BUSINESS DEVELOPMENT
  'sales': ['business development', 'revenue generation', 'account management', 'new business', 'commercial', 'selling', 'sales management', 'sales executive', 'sales manager'],
  'business development': ['sales', 'new business', 'revenue generation', 'commercial development', 'bd', 'bdr', 'business growth', 'new business development'],
  'account management': ['key account management', 'client management', 'account manager', 'kam', 'client services', 'client relationship management', 'account director'],
  'new business': ['business development', 'sales', 'new business hunter', 'outbound sales', 'lead generation', 'prospecting', 'cold calling', 'new logo'],
  'lead generation': ['demand generation', 'pipeline generation', 'inbound marketing', 'outbound marketing', 'prospecting', 'new business', 'sales pipeline'],
  'cold calling': ['outbound sales', 'telemarketing', 'telesales', 'prospecting', 'new business', 'outbound calling'],
  'telesales': ['cold calling', 'telemarketing', 'outbound sales', 'inside sales', 'telephone sales'],
  'field sales': ['territory sales', 'area sales', 'regional sales', 'outside sales', 'field based sales'],
  'territory management': ['area management', 'regional management', 'field sales', 'territory sales', 'patch management'],
  'b2b sales': ['b2b', 'business to business', 'corporate sales', 'enterprise sales', 'commercial sales'],
  'b2c sales': ['b2c', 'business to consumer', 'retail sales', 'consumer sales', 'direct sales'],
  'b2b': ['business to business', 'b2b sales', 'corporate sales', 'enterprise sales', 'b2b marketing'],
  'b2c': ['business to consumer', 'retail sales', 'consumer sales', 'direct sales', 'b2c marketing'],
  'enterprise sales': ['b2b sales', 'corporate sales', 'large account sales', 'strategic sales', 'complex sales'],
  'inside sales': ['telesales', 'internal sales', 'remote sales', 'phone sales', 'inbound sales'],
  'sales management': ['sales director', 'head of sales', 'sales manager', 'managing sales teams', 'sales leadership'],
  'revenue generation': ['sales', 'business development', 'income generation', 'revenue growth', 'commercial'],
  'pipeline management': ['sales pipeline', 'crm management', 'opportunity management', 'sales forecasting'],
  'sales forecasting': ['pipeline management', 'revenue forecasting', 'sales planning', 'quota management'],
  'tender management': ['bid management', 'proposal writing', 'rfp', 'tender writing', 'bid writing'],
  'bid management': ['tender management', 'proposal writing', 'rfp management', 'bid writing', 'tender writing'],
  'key account management': ['account management', 'strategic account management', 'kam', 'major accounts', 'enterprise accounts'],
  'contract negotiation': ['negotiation', 'commercial negotiation', 'deal closing', 'contract management'],
  'channel sales': ['partner sales', 'reseller management', 'channel management', 'indirect sales', 'distribution sales'],
  'solution selling': ['consultative selling', 'value selling', 'needs based selling', 'spin selling'],
  'consultative selling': ['solution selling', 'value selling', 'consultative sales', 'needs based selling'],

  // MARKETING & DIGITAL MARKETING
  'marketing': ['digital marketing', 'marketing management', 'brand management', 'marketing strategy', 'campaign management', 'marketing manager'],
  'digital marketing': ['marketing', 'online marketing', 'performance marketing', 'growth marketing', 'digital marketing analytics', 'marketing analytics', 'digital'],
  'digital marketing analytics': ['google analytics', 'marketing analytics', 'digital marketing', 'data analytics', 'performance marketing', 'analytics', 'web analytics'],
  'google analytics': ['digital marketing analytics', 'marketing analytics', 'analytics', 'web analytics', 'data analytics', 'ga4'],
  'seo': ['seo optimisation', 'search engine optimisation', 'organic search', 'seo management', 'search engine optimization'],
  'seo optimisation': ['seo', 'search engine optimisation', 'organic search', 'seo management', 'on page seo', 'off page seo'],
  'search engine optimisation': ['seo', 'seo optimisation', 'organic search', 'search ranking', 'google ranking'],
  'ppc': ['ppc management', 'paid search', 'google ads', 'paid advertising', 'performance marketing', 'pay per click'],
  'ppc management': ['ppc', 'paid search', 'google ads', 'paid advertising', 'performance marketing', 'sem'],
  'google ads': ['ppc', 'paid search', 'adwords', 'google adwords', 'paid advertising', 'sem'],
  'paid social': ['facebook ads', 'instagram ads', 'linkedin ads', 'social media advertising', 'paid social media'],
  'facebook ads': ['paid social', 'meta ads', 'facebook advertising', 'social media advertising', 'paid social media'],
  'social media': ['social media management', 'social media marketing', 'community management', 'social media strategy', 'social'],
  'social media management': ['social media', 'social media marketing', 'community management', 'community engagement', 'content creation', 'social media strategy'],
  'social media marketing': ['social media management', 'social media', 'content marketing', 'digital marketing', 'social media strategy'],
  'community engagement': ['social media management', 'social media', 'community management', 'stakeholder engagement', 'audience engagement'],
  'community management': ['social media management', 'community engagement', 'online community', 'forum management'],
  'content creation': ['copywriting', 'content marketing', 'content strategy', 'social media content', 'creative writing', 'blog writing'],
  'copywriting': ['content creation', 'content marketing', 'copy', 'creative writing', 'brand copywriting', 'ad copywriting', 'writing'],
  'content marketing': ['content creation', 'content strategy', 'blog writing', 'copywriting', 'inbound marketing'],
  'content strategy': ['content marketing', 'content planning', 'editorial strategy', 'content creation'],
  'email marketing': ['email campaigns', 'crm marketing', 'email automation', 'newsletter', 'email strategy', 'mailchimp', 'klaviyo'],
  'marketing automation': ['hubspot', 'marketo', 'pardot', 'email automation', 'crm marketing', 'automated marketing'],
  'campaign management': ['marketing campaigns', 'campaign delivery', 'campaign planning', 'marketing management', 'integrated campaigns'],
  'brand management': ['brand strategy', 'branding', 'brand marketing', 'brand development', 'brand identity'],
  'brand strategy': ['brand management', 'branding', 'brand positioning', 'brand identity', 'brand development'],
  'pr': ['public relations', 'media relations', 'press office', 'communications', 'press releases'],
  'public relations': ['pr', 'media relations', 'press office', 'communications', 'press releases', 'reputation management'],
  'marketing budget management': ['budget management', 'budgeting', 'marketing spend', 'campaign budget', 'p&l management'],
  'growth marketing': ['growth hacking', 'performance marketing', 'digital marketing', 'user acquisition', 'growth strategy'],
  'performance marketing': ['digital marketing', 'ppc', 'paid media', 'growth marketing', 'roi marketing'],
  'inbound marketing': ['content marketing', 'seo', 'hubspot', 'lead generation', 'inbound strategy'],
  'hubspot': ['crm', 'marketing automation', 'hubspot crm', 'inbound marketing', 'email marketing'],
  'salesforce': ['crm', 'customer relationship management', 'salesforce crm', 'sfdc', 'sales cloud'],
  'mailchimp': ['email marketing', 'email campaigns', 'marketing automation', 'newsletter', 'email automation'],
  'google tag manager': ['gtm', 'tag management', 'analytics implementation', 'tracking'],
  'fundraising': ['fundraising campaign support', 'charity fundraising', 'campaign management', 'donor engagement', 'income generation'],
  'fundraising campaign support': ['fundraising', 'campaign management', 'charity marketing', 'donor engagement', 'charity fundraising'],
  'b2b marketing': ['b2b', 'business to business', 'b2b sales', 'corporate marketing', 'demand generation'],
  'b2c marketing': ['b2c', 'business to consumer', 'consumer marketing', 'retail marketing', 'direct to consumer'],
  'market research': ['consumer research', 'competitor analysis', 'market analysis', 'customer insight', 'research'],
  'crm': ['customer relationship management', 'salesforce', 'hubspot', 'dynamics', 'crm management'],

  // SOCIAL CARE & HEALTHCARE
  'social care': ['care work', 'social work', 'care management', 'health and social care', 'social care management'],
  'care work': ['social care', 'care assistant', 'support worker', 'care worker', 'personal care', 'domiciliary care'],
  'care assistant': ['care worker', 'support worker', 'personal care', 'care work', 'healthcare assistant', 'hca'],
  'support worker': ['care worker', 'care assistant', 'social care', 'mental health support', 'learning disability support'],
  'social work': ['social care', 'case management', 'safeguarding', 'child protection', 'adult social care'],
  'safeguarding': ['child protection', 'adult safeguarding', 'safeguarding children', 'safeguarding adults', 'dbs', 'child welfare'],
  'child protection': ['safeguarding', 'safeguarding children', 'child welfare', 'looked after children', 'lac'],
  'case management': ['care management', 'case worker', 'social work', 'client management', 'caseload management'],
  'mental health': ['mental health support', 'mental health care', 'psychiatric care', 'psychological support', 'wellbeing'],
  'mental health support': ['mental health', 'mental health care', 'psychological support', 'wellbeing support', 'counselling'],
  'learning disabilities': ['learning disability support', 'ld', 'special needs', 'supported living', 'challenging behaviour'],
  'learning disability support': ['learning disabilities', 'ld', 'special needs', 'supported living', 'challenging behaviour'],
  'dementia care': ['elderly care', 'residential care', 'nursing care', 'memory care', 'dementia support'],
  'elderly care': ['older people', 'care of the elderly', 'residential care', 'nursing home', 'dementia care'],
  'domiciliary care': ['home care', 'care at home', 'community care', 'home help', 'personal care'],
  'residential care': ['care home', 'nursing home', 'residential home', 'care facility', 'elderly care'],
  'nursing': ['registered nurse', 'rn', 'clinical nursing', 'nursing care', 'nurse'],
  'healthcare assistant': ['hca', 'care assistant', 'clinical support', 'nursing assistant', 'ward assistant'],
  'care planning': ['care plan', 'individual care planning', 'person centred care', 'care assessment'],
  'person centred care': ['person centred support', 'individual care', 'personalised care', 'care planning'],
  'risk assessment': ['risk management', 'health and safety', 'safeguarding', 'care assessment', 'needs assessment'],
  'cqc': ['care quality commission', 'care regulation', 'ofsted', 'inspection', 'regulatory compliance'],
  'ofsted': ['cqc', 'inspection', 'regulatory compliance', 'education inspection', 'care regulation'],
  'nvq health and social care': ['nvq', 'health and social care qualification', 'care qualification', 'qcf', 'diploma in health and social care'],
  'medication management': ['medication administration', 'controlled drugs', 'dispensing medication', 'medication handling'],
  'autism': ['autism spectrum', 'asd', 'autism support', 'autistic spectrum disorder', 'neurodiversity'],
  'challenging behaviour': ['behaviour management', 'positive behaviour support', 'pbs', 'managing behaviour'],
  'supported living': ['independent living', 'learning disability support', 'community support', 'residential support'],
  'community care': ['domiciliary care', 'community support', 'care in the community', 'outreach support'],
  'adult social care': ['social care', 'care work', 'adult care', 'older peoples services', 'health and social care'],
  'children services': ['childrens services', 'child care', 'early years', 'child protection', 'family support'],
  'family support': ['children services', 'parenting support', 'early intervention', 'child welfare'],

  // SOFTWARE DEVELOPMENT & CODING
  'software development': ['software engineering', 'programming', 'coding', 'development', 'software developer'],
  'software engineering': ['software development', 'programming', 'engineering', 'development', 'software engineer'],
  'programming': ['coding', 'software development', 'development', 'software engineering', 'computer programming'],
  'coding': ['programming', 'software development', 'development', 'coding skills'],
  'full stack development': ['full stack', 'full stack developer', 'front end', 'back end', 'web development'],
  'front end development': ['frontend', 'front end', 'ui development', 'web development', 'client side development'],
  'back end development': ['backend', 'back end', 'server side development', 'api development', 'web development'],
  'web development': ['website development', 'front end development', 'back end development', 'full stack development'],
  'javascript': ['js', 'ecmascript', 'es6', 'nodejs', 'react', 'vue', 'angular', 'typescript'],
  'typescript': ['javascript', 'ts', 'typed javascript', 'angular', 'react typescript'],
  'react': ['reactjs', 'react.js', 'react native', 'frontend development', 'javascript', 'jsx'],
  'react native': ['react', 'mobile development', 'ios development', 'android development', 'cross platform'],
  'vue': ['vuejs', 'vue.js', 'frontend development', 'javascript framework', 'nuxt'],
  'angular': ['angularjs', 'angular.js', 'typescript', 'frontend development', 'javascript framework'],
  'nodejs': ['node.js', 'node', 'javascript', 'backend development', 'server side javascript'],
  'python': ['django', 'flask', 'fastapi', 'python development', 'data science', 'machine learning'],
  'django': ['python', 'python web framework', 'backend development', 'web development'],
  'java': ['spring boot', 'spring', 'java development', 'jvm', 'enterprise java'],
  'spring boot': ['java', 'spring', 'java framework', 'microservices', 'rest api'],
  'php': ['laravel', 'symfony', 'wordpress development', 'php development', 'backend development'],
  'laravel': ['php', 'php framework', 'backend development', 'web development'],
  'c#': ['dotnet', '.net', 'asp.net', 'c sharp', 'microsoft development'],
  'dotnet': ['.net', 'c#', 'asp.net', 'microsoft stack', 'dotnet core'],
  'swift': ['ios development', 'apple development', 'mobile development', 'objective-c'],
  'kotlin': ['android development', 'mobile development', 'java', 'android'],
  'ios development': ['swift', 'objective-c', 'apple development', 'mobile development', 'xcode'],
  'android development': ['kotlin', 'java', 'mobile development', 'android sdk', 'google play'],
  'mobile development': ['ios development', 'android development', 'react native', 'flutter', 'cross platform'],
  'flutter': ['dart', 'mobile development', 'cross platform', 'ios development', 'android development'],
  'sql': ['mysql', 'postgresql', 'database', 'relational database', 'database management', 'mssql'],
  'mysql': ['sql', 'database', 'relational database', 'mariadb', 'database management'],
  'postgresql': ['sql', 'postgres', 'database', 'relational database', 'database management'],
  'mongodb': ['nosql', 'database', 'document database', 'nosql database'],
  'nosql': ['mongodb', 'dynamodb', 'cassandra', 'redis', 'non relational database'],
  'database management': ['sql', 'database administration', 'dba', 'database design', 'data management'],
  'aws': ['amazon web services', 'cloud computing', 'cloud infrastructure', 'ec2', 's3', 'lambda'],
  'azure': ['microsoft azure', 'cloud computing', 'cloud infrastructure', 'azure devops', 'microsoft cloud'],
  'gcp': ['google cloud', 'google cloud platform', 'cloud computing', 'cloud infrastructure'],
  'cloud computing': ['aws', 'azure', 'gcp', 'cloud infrastructure', 'cloud services', 'cloud architecture'],
  'devops': ['ci/cd', 'continuous integration', 'continuous deployment', 'docker', 'kubernetes', 'infrastructure'],
  'docker': ['containerisation', 'containers', 'devops', 'kubernetes', 'docker compose'],
  'kubernetes': ['k8s', 'container orchestration', 'devops', 'docker', 'microservices'],
  'microservices': ['microservice architecture', 'api development', 'distributed systems', 'kubernetes', 'docker'],
  'api development': ['rest api', 'graphql', 'api design', 'backend development', 'microservices'],
  'rest api': ['api development', 'restful api', 'api', 'web services', 'http api'],
  'graphql': ['api development', 'rest api', 'query language', 'api design'],
  'git': ['github', 'gitlab', 'bitbucket', 'version control', 'source control'],
  'github': ['git', 'version control', 'source control', 'gitlab', 'code repository'],
  'agile': ['scrum', 'kanban', 'agile methodology', 'sprint', 'agile development'],
  'scrum': ['agile', 'sprint', 'scrum master', 'agile methodology', 'backlog management'],
  'test driven development': ['tdd', 'unit testing', 'automated testing', 'testing', 'qa'],
  'unit testing': ['testing', 'tdd', 'automated testing', 'test driven development', 'quality assurance'],
  'automated testing': ['test automation', 'selenium', 'cypress', 'unit testing', 'qa automation'],
  'cybersecurity': ['information security', 'cyber security', 'infosec', 'security', 'network security'],
  'information security': ['cybersecurity', 'infosec', 'cyber security', 'data security', 'security management'],
  'machine learning': ['ml', 'artificial intelligence', 'ai', 'data science', 'deep learning', 'python'],
  'artificial intelligence': ['ai', 'machine learning', 'ml', 'deep learning', 'nlp', 'neural networks'],
  'data science': ['machine learning', 'data analysis', 'python', 'r', 'statistics', 'data analytics'],
  'data engineering': ['data pipeline', 'etl', 'data architecture', 'big data', 'data infrastructure'],
  'ui design': ['user interface design', 'ux design', 'figma', 'interface design', 'visual design'],
  'ux design': ['user experience design', 'ui design', 'user research', 'wireframing', 'prototyping'],
  'figma': ['ui design', 'ux design', 'design tool', 'prototyping', 'wireframing'],
  'wordpress': ['cms', 'content management system', 'php', 'web development', 'website management'],
  'shopify': ['ecommerce development', 'ecommerce platform', 'online store development', 'liquid'],
  'terraform': ['infrastructure as code', 'iac', 'devops', 'cloud infrastructure', 'aws'],
  'linux': ['unix', 'bash', 'server administration', 'system administration', 'command line'],

  // LEADERSHIP & MANAGEMENT
  'team leadership': ['people management', 'staff management', 'team management', 'managing teams', 'line management', 'leadership', 'team leader'],
  'people management': ['team leadership', 'staff management', 'team management', 'managing people', 'line management', 'hr management'],
  'staff management': ['team leadership', 'people management', 'team management', 'managing staff', 'workforce management'],
  'line management': ['team leadership', 'people management', 'staff management', 'direct reports', 'managing people'],
  'senior management': ['director', 'senior leader', 'executive', 'c suite', 'board level', 'senior leadership'],
  'director': ['senior management', 'board director', 'managing director', 'director level', 'executive director'],
  'managing director': ['md', 'ceo', 'director', 'senior management', 'business leader'],
  'change management': ['transformation', 'organisational change', 'change programme', 'business transformation'],
  'stakeholder management': ['stakeholder engagement', 'relationship management', 'senior stakeholder management'],
  'performance management': ['appraisals', 'performance reviews', 'kpi management', 'staff performance', '1 to 1s'],

  // OPERATIONS & LOGISTICS
  'operations management': ['operations', 'operational management', 'ops management', 'operations manager', 'multi-site operations'],
  'multi-site operations': ['operations management', 'regional management', 'multi site', 'area management'],
  'logistics': ['supply chain', 'logistics coordination', 'logistics management', 'distribution', 'transport', 'haulage'],
  'supply chain': ['logistics', 'supply chain management', 'scm', 'distribution', 'procurement'],
  'supply chain management': ['logistics', 'supply chain', 'scm', 'distribution management', 'procurement'],
  'warehouse management': ['warehousing', 'warehouse operations', 'wms', 'warehouse manager', 'distribution centre'],
  'inventory management': ['inventory control', 'stock management', 'stock control', 'inventory', 'stock'],
  'inventory control': ['inventory management', 'stock management', 'stock control', 'inventory'],
  'stock management': ['inventory control', 'inventory management', 'stock control', 'stock'],
  'fleet management': ['transport management', 'vehicle management', 'fleet operations', 'logistics'],
  'transport management': ['fleet management', 'logistics', 'distribution', 'haulage', 'transport operations'],
  'procurement': ['purchasing', 'supply chain', 'buying', 'strategic procurement', 'vendor management'],
  'project management': ['project delivery', 'programme management', 'project manager', 'pmo', 'project planning'],
  'programme management': ['project management', 'programme delivery', 'pmo', 'portfolio management'],

  // FINANCE & COMMERCIAL
  'financial management': ['finance', 'financial planning', 'fp&a', 'financial analysis', 'p&l', 'finance manager'],
  'p&l management': ['p&l responsibility', 'profit and loss', 'financial management', 'budget management', 'p&l'],
  'budget management': ['budgeting', 'financial management', 'cost management', 'p&l', 'marketing budget management'],
  'financial analysis': ['financial modelling', 'fp&a', 'financial reporting', 'data analysis', 'forecasting'],
  'accountancy': ['accounting', 'bookkeeping', 'management accounts', 'financial reporting', 'aca', 'acca', 'cima'],
  'management accounts': ['management accounting', 'financial reporting', 'accountancy', 'monthly accounts'],

  // HR & RECRUITMENT
  'recruitment': ['talent acquisition', 'hiring', 'resourcing', 'talent management', 'recruiter'],
  'talent acquisition': ['recruitment', 'hiring', 'resourcing', 'headhunting', 'talent sourcing'],
  'hr management': ['human resources', 'hr', 'people management', 'hr business partner', 'hrbp'],
  'human resources': ['hr', 'hr management', 'people management', 'hr business partner', 'hrbp'],
  'employee relations': ['er', 'employment law', 'grievance', 'disciplinary', 'hr'],
  'talent management': ['succession planning', 'learning and development', 'recruitment', 'hr', 'people development'],
  'learning and development': ['l&d', 'training', 'talent development', 'employee development', 'training management'],
  'training': ['learning and development', 'l&d', 'coaching', 'employee training', 'staff development'],
  'cipd': ['hr qualification', 'chartered institute of personnel development', 'hr certified', 'people professional'],
  'employment law': ['hr', 'employee relations', 'tupe', 'redundancy', 'employment tribunal'],

  // RETAIL & FMCG
  'retail management': ['store management', 'retail operations', 'shop management', 'retail manager'],
  'store management': ['retail management', 'shop management', 'store manager', 'retail operations'],
  'retail': ['retail management', 'retail operations', 'store management', 'fmcg', 'consumer goods'],
  'fmcg': ['retail', 'consumer goods', 'fast moving consumer goods', 'cpg', 'grocery'],
  'category management': ['buying', 'merchandising', 'product management', 'range management', 'category manager'],
  'merchandising': ['visual merchandising', 'product placement', 'retail merchandising', 'category management'],
  'buying': ['procurement', 'purchasing', 'category management', 'buyer', 'product buying'],
  'customer experience': ['cx', 'customer service', 'customer satisfaction', 'customer journey', 'customer success'],
  'saas': ['software as a service', 'cloud software', 'subscription software', 'tech sales'],
  'e-commerce': ['ecommerce', 'online retail', 'digital retail', 'online sales'],
  'ecommerce': ['e-commerce', 'online retail', 'digital retail', 'online sales'],
  'hospitality': ['hotels', 'food and beverage', 'f&b', 'restaurant management'],
  'healthcare': ['medical', 'nhs', 'health sector', 'clinical'],

  // TECHNOLOGY & SYSTEMS
  'wms': ['warehouse management system', 'warehouse management', 'warehouse software', 'manhattan', 'sap wm'],
  'erp': ['enterprise resource planning', 'sap', 'oracle', 'netsuite', 'dynamics', 'sage'],
  'sap': ['erp', 'sap erp', 'sap system', 'sap implementation', 'sap consultant'],
  'microsoft office': ['excel', 'word', 'powerpoint', 'outlook', 'office 365', 'microsoft 365'],
  'excel': ['microsoft excel', 'spreadsheets', 'data analysis', 'vlookup', 'pivot tables', 'microsoft office'],
  'power bi': ['business intelligence', 'bi', 'data visualisation', 'reporting', 'tableau'],
  'tableau': ['data visualisation', 'business intelligence', 'bi', 'power bi', 'reporting'],
  'jira': ['project management tool', 'agile tool', 'issue tracking', 'atlassian', 'scrum tool'],

  // COMPLIANCE & SAFETY
  'health and safety': ['safety compliance', 'hse', 'safety management', 'risk assessment', 'nebosh', 'iosh'],
  'safety compliance': ['health and safety', 'hse', 'safety management', 'compliance', 'iso'],
  'nebosh': ['health and safety', 'safety qualification', 'hse', 'safety management', 'iosh'],
  'iso': ['iso 9001', 'quality management', 'quality standards', 'compliance', 'iso certification'],
  'gdpr': ['data protection', 'data privacy', 'information governance', 'data compliance', 'ico'],
  'data protection': ['gdpr', 'data privacy', 'information security', 'data compliance', 'dpa'],
  'compliance': ['regulatory compliance', 'risk management', 'governance', 'audit', 'quality management'],

  // CUSTOMER SERVICE
  'customer service': ['customer support', 'client services', 'customer success', 'customer relations', 'customer care'],
  'customer success': ['customer service', 'client success', 'customer support', 'account management', 'cx'],
  'customer support': ['customer service', 'technical support', 'helpdesk', 'customer care', 'client support'],
  'helpdesk': ['it support', 'technical support', 'service desk', 'customer support', 'first line support'],

  // EDUCATION & TRAINING
  'teaching': ['education', 'teacher', 'lecturer', 'training', 'instruction', 'pedagogy'],
  'education': ['teaching', 'learning', 'training', 'educational', 'academic'],
  'early years': ['eyfs', 'early years education', 'nursery', 'childcare', 'reception'],
  'send': ['special educational needs', 'sen', 'special needs', 'inclusion', 'learning support'],

  // PROPERTY & CONSTRUCTION
  'construction management': ['site management', 'project management', 'construction', 'building management'],
  'facilities management': ['fm', 'building management', 'property management', 'estates management'],
  'property management': ['facilities management', 'real estate', 'estate management', 'lettings management'],

  // GENERAL PROFESSIONAL
  'analysis': ['data analysis', 'analytical skills', 'reporting', 'insight', 'research'],
  'reporting': ['data reporting', 'analysis', 'kpi reporting', 'management information', 'mi'],
  'communication': ['written communication', 'verbal communication', 'presentation skills', 'stakeholder communication'],
  'presentation skills': ['public speaking', 'presenting', 'communication', 'pitching', 'powerpoint'],
  'negotiation': ['contract negotiation', 'commercial negotiation', 'influencing', 'deal making'],
  'relationship management': ['stakeholder management', 'account management', 'client relationship', 'partnership management'],
  'strategy': ['strategic planning', 'business strategy', 'strategic development', 'planning'],
  'strategic planning': ['strategy', 'business planning', 'long term planning', 'strategic development'],
  'problem solving': ['analytical thinking', 'critical thinking', 'troubleshooting', 'solution finding'],
  'microsoft 365': ['office 365', 'microsoft office', 'sharepoint', 'teams', 'onedrive'],
  'office 365': ['microsoft 365', 'microsoft office', 'sharepoint', 'teams', 'outlook'],
}

function normalise(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s&./]/g, '').replace(/\s+/g, ' ')
}

function getWordArray(str: string): string[] {
  return normalise(str).split(' ').filter(w => w.length > 2)
}

function semanticMatch(candidateKeyword: string, jobSkill: string): boolean {
  const ck = normalise(candidateKeyword)
  const js = normalise(jobSkill)
  if (ck === js) return true
  if (ck.includes(js) || js.includes(ck)) return true
  const ckWords = getWordArray(ck)
  const jsWords = getWordArray(js)
  const jsWordSet = new Set(jsWords)
  const overlap = ckWords.filter(w => jsWordSet.has(w)).length
  const minLen = Math.min(ckWords.length, jsWords.length)
  if (minLen > 0 && overlap / minLen >= 0.5) return true
  const synonymList = SYNONYMS[ck] || []
  if (synonymList.some(s => normalise(s) === js || js.includes(normalise(s)) || normalise(s).includes(js))) return true
  const reverseSynonyms = SYNONYMS[js] || []
  if (reverseSynonyms.some(s => normalise(s) === ck || ck.includes(normalise(s)) || normalise(s).includes(ck))) return true
  return false
}

function calculateMatch(candidate: any, job: any, priority: string): { score: number, matches: string[] } {
  const weights = MATCH_WEIGHTS[priority as keyof typeof MATCH_WEIGHTS] || MATCH_WEIGHTS.skills
  const candidateKeywords = (candidate.strength_keywords || [])
  const candidateSkills = (candidate.skills || [])
  const allCandidateKeywords = Array.from(new Set([...candidateKeywords, ...candidateSkills]))
  const jobSkills = (job.required_skills || [])
  const jobSector = (job.sector || '').toLowerCase()
  const jobLocation = (job.location || '').toLowerCase()
  const jobTitle = (job.title || '').toLowerCase()

  const keywordMatches: string[] = []
  let keywordScore = 0
  if (jobSkills.length > 0) {
    for (const jobSkill of jobSkills) {
      for (const candidateKeyword of allCandidateKeywords) {
        if (semanticMatch(candidateKeyword, jobSkill)) {
          if (!keywordMatches.includes(candidateKeyword)) keywordMatches.push(candidateKeyword)
          break
        }
      }
    }
    keywordScore = Math.min(100, Math.round((keywordMatches.length / jobSkills.length) * 100))
  } else {
    keywordScore = 50
  }

  let experienceScore = 50
  const years = candidate.years_experience || 0
  if (jobTitle.includes('senior') || jobTitle.includes('lead') || jobTitle.includes('head') || jobTitle.includes('director')) {
    experienceScore = years >= 7 ? 100 : years >= 5 ? 75 : years >= 3 ? 50 : 25
  } else if (jobTitle.includes('junior') || jobTitle.includes('graduate') || jobTitle.includes('entry')) {
    experienceScore = years <= 3 ? 100 : years <= 5 ? 75 : 50
  } else if (jobTitle.includes('manager') || jobTitle.includes('executive')) {
    experienceScore = years >= 4 ? 100 : years >= 2 ? 75 : years >= 1 ? 50 : 25
  } else {
    experienceScore = years >= 2 ? 100 : years >= 1 ? 75 : 50
  }

  let sectorScore = 50
  if (jobSector) {
    const jobSectorNorm = normalise(jobSector)
    const jobSectorWords = getWordArray(jobSectorNorm)
    const sectorMatch = allCandidateKeywords.some((ck: string) => {
      const ckNorm = normalise(ck)
      if (ckNorm.includes(jobSectorNorm) || jobSectorNorm.includes(ckNorm)) return true
      const ckWords = getWordArray(ckNorm)
      const jobSectorWordSet = new Set(jobSectorWords)
      return ckWords.some(w => jobSectorWordSet.has(w))
    })
    sectorScore = sectorMatch ? 100 : 30
  }

  let locationScore = 50
  if (job.work_type === 'remote') {
    locationScore = 100
  } else if (job.work_type === 'hybrid') {
    locationScore = 70
  } else {
    const candidateLocation = (candidate.location || '').toLowerCase()
    if (candidateLocation && jobLocation) {
      if (candidateLocation.includes(jobLocation) || jobLocation.includes(candidateLocation)) {
        locationScore = 100
      } else {
        const jobCity = jobLocation.split(',')[0].trim()
        const candidateCity = candidateLocation.split(',')[0].trim()
        locationScore = (jobCity && candidateCity && (jobCity.includes(candidateCity) || candidateCity.includes(jobCity))) ? 100 : 20
      }
    }
  }

  const total = Math.round(
    (keywordScore * weights.keywords / 100) +
    (experienceScore * weights.experience / 100) +
    (sectorScore * weights.sector / 100) +
    (locationScore * weights.location / 100)
  )

  return { score: Math.min(100, total), matches: keywordMatches }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Unauthorised' })

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user } } = await authClient.auth.getUser(token)
    if (!user) return res.status(401).json({ error: 'Unauthorised' })
    const userId = user.id

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { jobId } = req.body
    if (!jobId) return res.status(400).json({ error: 'jobId required' })

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single()

    if (jobError || !job) return res.status(404).json({ error: 'Job not found' })

    const { data: candidates, error: candError } = await supabase
      .from('candidates')
      .select('*')
      .eq('user_id', userId)

    if (candError) throw candError

    const { data: existingMatches } = await supabase
      .from('job_candidates')
      .select('candidate_id, status, permanently_rejected')
      .eq('job_id', jobId)

    const existingStatusMap: Record<string, string> = {}
    const permanentlyRejected = new Set<string>()
    for (const m of existingMatches || []) {
      existingStatusMap[m.candidate_id] = m.status
      if (m.permanently_rejected || m.status === 'rejected') permanentlyRejected.add(m.candidate_id)
    }

    // Filter out permanently rejected candidates before matching
    const activeCandidates = candidates.filter((c: any) => !permanentlyRejected.has(c.id))

    // Any candidate past the matched stage should not be re-evaluated
    // This protects interview data and pipeline position from being overwritten
    const PROTECTED_STATUSES = [
      'shortlisted', 'shortlist',
      'voice_sent', 'invited',
      'interview_booked', 'interview_done', 'interviewed',
      'second_round', 'job_offer',
      'hired', 'rejected'
    ]
    const priority = job.match_priority || 'skills'
    const threshold = job.match_threshold || 70
    const results = []

    for (const candidate of activeCandidates || []) {
      const existingStatus = existingStatusMap[candidate.id]
      const isProtected = existingStatus && PROTECTED_STATUSES.includes(existingStatus)

      // Skip full re-scoring for candidates past matched stage
      // Just include them in results with their existing status preserved
      if (isProtected && existingStatus !== 'shortlist' && existingStatus !== 'longlist') {
        // Still include in results for display but don't touch their record
        results.push({
          candidate_id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          role_applied: candidate.role_applied,
          years_experience: candidate.years_experience,
          last_employer: candidate.last_employer,
          location: candidate.location,
          strength_keywords: candidate.strength_keywords,
          match_score: candidate.cv_match_score || 0,
          cv_score: candidate.cv_match_score || null,
          interview_score: candidate.interview_score || null,
          keyword_matches: [],
          status: existingStatus,
          already_sent: true
        })
        continue
      }
      // Detect if candidate has no CV data (came in via interview link only)
      const hasNoCv = !candidate.experience_summary &&
        !candidate.skills?.length &&
        !candidate.strength_keywords?.length &&
        !candidate.years_experience &&
        !candidate.last_employer

      let cvScore: number | null = null
      let matches: string[] = []

      if (!hasNoCv) {
        const result = calculateMatch(candidate, job, priority)
        cvScore = result.score
        matches = result.matches
      }

      const interviewScore = candidate.interview_score || null
      const combinedScore = getCombinedScore(cvScore, interviewScore)
      const newStatus = combinedScore >= threshold ? 'shortlist' : 'longlist'

      await supabase
        .from('job_candidates')
        .upsert({
          job_id: jobId,
          candidate_id: candidate.id,
          match_score: combinedScore,
          keyword_matches: matches,
          status: newStatus,
          updated_at: new Date().toISOString()
        }, { onConflict: 'job_id,candidate_id' })

      // Save cv_match_score back to the candidate for unified scoring across all views
      await supabase
        .from('candidates')
        .update({ cv_match_score: cvScore ?? null, no_cv: hasNoCv })
        .eq('id', candidate.id)

      results.push({
        candidate_id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        role_applied: candidate.role_applied,
        years_experience: candidate.years_experience,
        last_employer: candidate.last_employer,
        location: candidate.location,
        strength_keywords: candidate.strength_keywords,
        match_score: combinedScore,
        cv_score: cvScore,
        interview_score: interviewScore,
        keyword_matches: matches,
        status: newStatus,
        already_sent: false
      })
    }

    results.sort((a, b) => b.match_score - a.match_score)

    return res.status(200).json({
      success: true,
      jobId,
      priority,
      threshold,
      total: results.length,
      shortlist: results.filter(r => r.status === 'shortlist').length,
      longlist: results.filter(r => r.status === 'longlist').length,
      results
    })

  } catch (err: any) {
    console.error('Match candidates error:', err)
    return res.status(500).json({ error: err.message || 'Failed to match candidates' })
  }
}
