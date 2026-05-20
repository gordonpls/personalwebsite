import { useState } from "react";

export const BirthdayInput = ({ month, setMonth, day, setDay }) => {

    const handleDayChange = (e) => {
        let value = e.target.value.replace(/\D/g, ""); // Remove non-numeric chars
        let num = parseInt(value, 10);

        if (!isNaN(num)) {
            if (num < 1) num = 1; // Prevents negative numbers
            if (num > 31) num = 31; // Restricts max day to 31
        } else {
            num = ""; // Empty if invalid
        }

        setDay(num.toString());
    };

    return (
        <div>
            {/* <label className="block text-lg font-semibold mb-2">Select Your Birthday</label> */}
            <fieldset className="fieldset">
                <legend className="fieldset-legend">What is your birthday?</legend>
                <div className="flex gap-2">
                    {/* Month Dropdown */}
                    <select
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="select"
                        required
                    >
                        <option value="">Month</option>
                        {["January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December"]
                            .map((m, index) => (
                                <option key={index} value={m}>{m}</option>
                            ))}
                    </select>

                    {/* Day Input */}
                    <input
                        type="text"
                        value={day}
                        onChange={handleDayChange}
                        placeholder="Day"
                        className="input"
                        maxLength={2}
                    />
                </div>
            </fieldset>
        </div>
    );
};

/*
                <div>
                    <select
                        id="sign"
                        value={sign}
                        onChange={(e) => setSign(e.target.value)}
                        className="select"
                        required
                    >
                        <option value="" disabled>
                            Select your sign
                        </option>
                        <option value="Aries">Aries</option>
                        <option value="Taurus">Taurus</option>
                        <option value="Gemini">Gemini</option>
                        <option value="Cancer">Cancer</option>
                        <option value="Leo">Leo</option>
                        <option value="Virgo">Virgo</option>
                        <option value="Libra">Libra</option>
                        <option value="Scorpio">Scorpio</option>
                        <option value="Sagittarius">Sagittarius</option>
                        <option value="Capricorn">Capricorn</option>
                        <option value="Aquarius">Aquarius</option>
                        <option value="Pisces">Pisces</option>
                    </select>
                </div>
                */