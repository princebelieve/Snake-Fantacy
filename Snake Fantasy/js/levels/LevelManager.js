// js/levels/LevelManager.js
export class LevelManager {
    constructor(storage) {
        this.storage = storage;
        this.levels = this.createLevels();
    }

    createLevels() {
        return {
            1: {
                name: 'Level 1',
                difficulty: 'Easy',
                speed: 150,
                targetFoods: 5,
                gridSize: 20,
                snake: [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}],
                foods: [{x: 15, y: 10, type: 'apple', points: 10, color: '#ff6b6b'}],
                obstacles: [],
                portals: []
            },
            2: {
                name: 'Level 2',
                difficulty: 'Faster',
                speed: 100,
                targetFoods: 8,
                gridSize: 20,
                snake: [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}],
                foods: [
                    {x: 15, y: 10, type: 'apple', points: 10, color: '#ff6b6b'},
                    {x: 5, y: 5, type: 'strawberry', points: 15, color: '#ff4757'}
                ],
                obstacles: [],
                portals: []
            },
            3: {
                name: 'Level 3',
                difficulty: 'Moving Obstacles',
                speed: 120,
                targetFoods: 10,
                gridSize: 20,
                snake: [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}],
                foods: [
                    {x: 15, y: 10, type: 'apple', points: 10, color: '#ff6b6b'},
                    {x: 5, y: 15, type: 'banana', points: 20, color: '#ffd93d'}
                ],
                obstacles: [
                    {x: 7, y: 7}, {x: 7, y: 8}, {x: 7, y: 9},
                    {x: 13, y: 7}, {x: 13, y: 8}, {x: 13, y: 9}
                ],
                portals: []
            },
            4: {
                name: 'Level 4',
                difficulty: 'Maze',
                speed: 130,
                targetFoods: 8,
                gridSize: 20,
                snake: [{x: 2, y: 2}, {x: 1, y: 2}],
                foods: [
                    {x: 17, y: 17, type: 'golden', points: 50, color: '#f9ca24'}
                ],
                obstacles: [
                    {x: 4, y: 0}, {x: 4, y: 1}, {x: 4, y: 2}, {x: 4, y: 3}, {x: 4, y: 4},
                    {x: 0, y: 4}, {x: 1, y: 4}, {x: 2, y: 4}, {x: 3, y: 4},
                    {x: 15, y: 0}, {x: 15, y: 1}, {x: 15, y: 2}, {x: 15, y: 3}, {x: 15, y: 4},
                    {x: 16, y: 4}, {x: 17, y: 4}, {x: 18, y: 4}, {x: 19, y: 4},
                    {x: 0, y: 15}, {x: 1, y: 15}, {x: 2, y: 15}, {x: 3, y: 15},
                    {x: 4, y: 15}, {x: 4, y: 16}, {x: 4, y: 17}, {x: 4, y: 18}, {x: 4, y: 19},
                    {x: 15, y: 15}, {x: 15, y: 16}, {x: 15, y: 17}, {x: 15, y: 18}, {x: 15, y: 19},
                    {x: 16, y: 15}, {x: 17, y: 15}, {x: 18, y: 15}, {x: 19, y: 15}
                ],
                portals: []
            },
            5: {
                name: 'Level 5',
                difficulty: 'Teleport Portals',
                speed: 110,
                targetFoods: 10,
                gridSize: 20,
                snake: [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}],
                foods: [
                    {x: 5, y: 5, type: 'apple', points: 10, color: '#ff6b6b'},
                    {x: 15, y: 5, type: 'strawberry', points: 15, color: '#ff4757'},
                    {x: 5, y: 15, type: 'banana', points: 20, color: '#ffd93d'},
                    {x: 15, y: 15, type: 'golden', points: 50, color: '#f9ca24'}
                ],
                obstacles: [],
                portals: [
                    {id: 1, x: 2, y: 10},
                    {id: 2, x: 17, y: 10}
                ]
            }
        };
    }

    getLevel(level) {
        return this.levels[level] || this.levels[1];
    }

    getTotalLevels() {
        return Object.keys(this.levels).length;
    }

    isLevelUnlocked(level) {
        return this.storage.isLevelUnlocked(level);
    }
}