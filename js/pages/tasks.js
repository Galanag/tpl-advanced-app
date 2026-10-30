export default {
    render: () => {
        return `
            <div class="page-enter max-w-md mx-auto p-4">
                <!-- Stats Header -->
                <div class="bg-gradient-to-r from-orange-400 to-yellow-500 rounded-2xl p-4 text-white flex justify-between mb-6 shadow-md">
                    <div class="text-center">
                        <p class="text-2xl font-bold">0</p>
                        <p class="text-[10px] opacity-90">በቅርቡ የሚጀምሩ</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold">0</p>
                        <p class="text-[10px] opacity-90">ተግባራት</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold">0</p>
                        <p class="text-[10px] opacity-90">ገቢ</p>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="flex border-b border-gray-200 mb-4">
                    <button class="flex-1 py-2 text-primary font-bold border-b-2 border-primary text-sm">ሁሉም</button>
                    <button class="flex-1 py-2 text-gray-500 font-medium text-sm">Unprocessed</button>
                    <button class="flex-1 py-2 text-gray-500 font-medium text-sm">Completed</button>
                    <button class="flex-1 py-2 text-gray-500 font-medium text-sm">Failed</button>
                </div>

                <!-- Empty State -->
                <div class="flex flex-col items-center justify-center py-20 text-gray-400">
                    <i class="fas fa-box-open text-5xl mb-4 opacity-50"></i>
                    <p class="text-sm">ምንም የተገኘ አልተገኘም</p>
                </div>
            </div>
        `;
    },
    init: () => {
        // Add tab switching logic here
    }
};