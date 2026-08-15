export interface FAQItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What is Reposcope?',
    answer:
      'Reposcope is a free, open-source analytics platform for the open source world. It provides deep insights into repositories, developers, and organizations — including stars, commits, pull requests, issues, and community health metrics — computed live from GitHub.',
  },
  {
    question: 'How does Reposcope analyze repositories?',
    answer:
      'Reposcope reads live data from GitHub\'s public API — stars, forks, events, contributors — and computes a health score and analytics dashboard for any repository on the spot. No account or backend required.',
  },
  {
    question: 'Is Reposcope free to use?',
    answer:
      'Yes. Reposcope is completely free and open source. The source code is available on GitHub at github.com/reposcope/reposcope under an Apache 2.0 license.',
  },
  {
    question: 'What data does Reposcope use?',
    answer:
      'Reposcope pulls live public GitHub data — stars, forks, issues, pull requests, commits, pushes, and comments — straight from GitHub\'s API when you look something up.',
  },
  {
    question: 'How often is the data updated?',
    answer:
      'Data is fetched live from GitHub\'s public API, so metrics are current as of the moment you load a page.',
  },
  {
    question: 'Can I analyze my own GitHub profile?',
    answer:
      'Yes. Enter your GitHub username in the search box and Reposcope will generate a full developer profile showing your contribution history, starred repositories, programming languages used, and activity trends over time.',
  },
];
