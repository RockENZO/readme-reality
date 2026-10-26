export const examples: {id:string;name:string;subtitle:string;broken:string;fixed:string;files:Record<string,string>}[] = [
  {
    id:'node', name:'Node quickstart', subtitle:'A renamed script. A missing screenshot.',
    broken:'# Parcel Desk\n\nA tiny shipping dashboard.\n\n![Dashboard](assets/preview.png)\n\n```bash\nnpm run start\n```\n\n[Setup guide](docs/setup.md)\n',
    fixed:'# Parcel Desk\n\nA tiny shipping dashboard.\n\n![Dashboard](assets/dashboard.svg)\n\n```bash\nnpm run dev\n```\n\n[Setup guide](docs/setup.md)\n',
    files:{'package.json':'{"scripts":{"dev":"vite","build":"vite build"}}','assets/dashboard.svg':'<svg/>','docs/setup.md':'# Setup'}
  },
  {
    id:'python',name:'Python quickstart',subtitle:'A stale training path. A real replacement.',
    broken:'# Field Notes\n\n```bash\npip install -r requirements-dev.txt\npython scripts/train.py\n```\n\n[Evaluation](docs/evaluation.md)\n',
    fixed:'# Field Notes\n\n```bash\npip install -r requirements.txt\npython scripts/evaluate.py\n```\n\n[Evaluation](docs/evaluation.md)\n',
    files:{'requirements.txt':'numpy\n','scripts/evaluate.py':'print("example")','docs/evaluation.md':'# Evaluation'}
  },
  {
    id:'mixed',name:'Honest coverage',subtitle:'Some things can be checked. Others cannot.',
    broken:'# Studio\n\n```sh\ncd web\npnpm run preview\n```\n\n```bash\npython -m streamlit run app.py\npython "$TRAIN_SCRIPT"\n```\n\n[API notes][api]\n\n[api]: docs/api.md\n',
    fixed:'# Studio\n\n```sh\ncd web\npnpm run dev\n```\n\n```bash\npython -m streamlit run app.py\npython "$TRAIN_SCRIPT"\n```\n\n[API notes][api]\n\n[api]: docs/api.md\n',
    files:{'web/package.json':'{"scripts":{"dev":"vite"}}','docs/api.md':'# API'}
  },
  {
    id:'html',name:'Profile media',subtitle:'An HTML card. A renamed demo recording.',
    broken:'# Toolkit\n\n<a href="docs/guide.md"><img src="assets/preview.gif" alt="Recorded example"></a>\n',
    fixed:'# Toolkit\n\n<a href="docs/guide.md"><img src="assets/walkthrough.gif" alt="Recorded example"></a>\n',
    files:{'docs/guide.md':'# Guide','assets/walkthrough.gif':'fictional file-presence fixture, not an image validation'}
  }
];
