export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export interface LegalDocumentContent {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}
