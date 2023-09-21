// import { writable } from 'svelte/store';
// import type { MCProject } from '$lib/mermaidChartApi';

// interface MCProjectDB {
//   filterStr: string;
//   list: string[];
//   projects: Record<string, MCProject>;
// }

// const defaultDB: MCProjectDB = {
//   filterStr: '',
//   list: [],
//   projects: {}
// };

// function createProjectStore() {
//   const { subscribe, set, update } = writable(defaultDB);
//   return {
//     subscribe,
//     fetchProjects: async () => {
//       const projects = await getProjects();
//       const res = update((projectDB) => {
//         projectDB.list = [];
//         projectDB.projects = {};

//         if(projects) {
//           for (const project of projects) {
//             if (project) {
//               projectDB.list.push(project.id);
//               projectDB.projects[project.id] = project;
//             }
//           }
//           projectDB.list.sort((a, b) => doSort(a, b, 'title', projectDB.projects, 'asc'));

//         }
//         return { ...projectDB };
//       });
//       return res;
//     },
//     reset: () => set(defaultDB)
//   };
// }


// function doSort(
//   aId: string,
//   bId: string,
//   sortBy: string | undefined,
//   projects: Record<string, MCProject>,
//   direction?: string
// ): number {
//   switch (sortBy) {
//     case 'title': {
//       const a = projects[aId];
//       const b = projects[bId];

//       return (a.title < b.title) ? -1 : (a.title > b.title) ? 1 : 0;
//     }
//   }

//   return 0;
// }

// export const projectStore = createProjectStore();
