export default {
    render: () => {
        return `
            <div class="page-enter max-w-md mx-auto">
                <!-- Wallet Balance Card -->
                <div class="bg-gradient-to-br from-orange-500 to-orange-400 p-6 text-white rounded-b-3xl shadow-lg mb-6">
                    <p class="text-sm opacity-90 mb-1">የኮሚሽን ማጠራቀሚያ</p>
                    <h2 class="text-4xl font-bold mb-4">170.00 <span class="text-lg font-normal">Br</span></h2>
                    <div class="flex gap-4">
                        <button class="flex-1 bg-white text-orange-500 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-gray-50 transition">
                            <i class="fas fa-download mr-1"></i> ገንዘብ ማውጣት
                        </button>
                        <button class="flex-1 bg-orange-600/50 backdrop-blur-sm text-white py-2 rounded-lg font-bold text-sm shadow-md hover:bg-orange-600/70 transition">
                            <i class="fas fa-exchange-alt mr-1"></i> ማስተላለፍ
                        </button>
                    </div>
                </div>

                <!-- Balances List -->
                <div class="px-4 space-y-3">
                    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div>
                            <p class="text-xs text-gray-500">የቀጥታ ገቢ (Br)</p>
                            <p class="font-bold text-lg mt-1">170.00</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs text-gray-500">የተጠራቀመ (Br)</p>
                            <p class="font-bold text-lg mt-1 text-green-500">0.00</p>
                        </div>
                    </div>

                    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div>
                            <p class="text-xs text-gray-500">የቡድን ገቢ (Br)</p>
                            <p class="font-bold text-lg mt-1">0.00</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs text-gray-500">የተጠራቀመ (Br)</p>
                            <p class="font-bold text-lg mt-1 text-green-500">0.00</p>
                        </div>
                    </div>
                </div>

                <!-- History Log -->
                <div class="px-4 mt-6">
                    <h3 class="font-bold text-sm mb-3">የግብይት ታሪክ</h3>
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-center">
                        <div>
                            <p class="text-xs font-medium text-gray-800">የኮሚሽን ማስተካከያ</p>
                            <p class="text-[10px] text-gray-400 mt-1">2026-10-09 14:00:19</p>
                        </div>
                        <span class="text-green-500 font-bold text-sm">+170.00</span>
                    </div>
                </div>
            </div>
        `;
    },
    init: () => {}
};