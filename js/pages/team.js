export default {
    render: () => {
        return `
            <div class="page-enter max-w-md mx-auto p-4">
                <!-- Invite Banner -->
                <div class="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 class="font-bold text-sm">የእርስዎ የግብዣ ሊንክ</h3>
                        <p class="text-xs text-gray-500 mt-1">የግብዣ ኮድ: <span class="font-bold text-primary">2632018</span></p>
                    </div>
                    <button class="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-orange-600 transition">
                        <i class="fas fa-share-alt mr-1"></i> አጋራ
                    </button>
                </div>

                <!-- Levels List -->
                <div class="space-y-3">
                    <!-- Level P1 -->
                    <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-400 flex justify-between items-center">
                        <div>
                            <h4 class="font-bold text-gray-800">P1</h4>
                            <p class="text-[10px] text-gray-500 mt-1">የግል ቡድንዎ መጠን: 5</p>
                            <p class="text-[10px] text-gray-500">የሚያስፈልግ ገቢ: 500.00 ETB</p>
                        </div>
                        <div class="text-right">
                            <span class="bg-orange-100 text-orange-600 text-[10px] px-2 py-1 rounded-full font-bold">10%</span>
                        </div>
                    </div>
                    
                    <!-- Level P2 -->
                    <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-400 flex justify-between items-center">
                        <div>
                            <h4 class="font-bold text-gray-800">P2</h4>
                            <p class="text-[10px] text-gray-500 mt-1">የግል ቡድንዎ መጠን: 9</p>
                            <p class="text-[10px] text-gray-500">የሚያስፈልግ ገቢ: 1500.00 ETB</p>
                        </div>
                        <div class="text-right">
                            <span class="bg-blue-100 text-blue-600 text-[10px] px-2 py-1 rounded-full font-bold">3%</span>
                        </div>
                    </div>
                    
                    <!-- Level P3 -->
                    <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-400 flex justify-between items-center">
                        <div>
                            <h4 class="font-bold text-gray-800">P3</h4>
                            <p class="text-[10px] text-gray-500 mt-1">የግል ቡድንዎ መጠን: 15</p>
                            <p class="text-[10px] text-gray-500">የሚያስፈልግ ገቢ: 5000.00 ETB</p>
                        </div>
                        <div class="text-right">
                            <span class="bg-green-100 text-green-600 text-[10px] px-2 py-1 rounded-full font-bold">2%</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    init: () => {}
};