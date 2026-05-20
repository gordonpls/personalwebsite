import { BirthdayInput } from "../subcomponents/BirthdayInput";

export const HoroscopeForm = ({ name, setName, month, setMonth, day, setDay, handleSubmit }) => {
    return (
        <div className="lg:w-full flex flex-col lg:py-4 gap-4 justify-items-center">
            <form onSubmit={handleSubmit} className="w-full">
                <div className="lg:w-xl flex flex-col gap-4">
                    {/* Name Input */}
                    <fieldset className="w-full fieldset">
                        <legend className="fieldset-legend">What is your name?</legend>
                        <input
                            id="name"
                            type="text"
                            className="lg:w-full p-2 border border-gray-300 rounded-md input validator"
                            required
                            placeholder="Name"
                            value={name}
                            onChange={(e) => {
                                const onlyLetters = e.target.value.replace(/[^a-zA-Z\s]/g, ""); // Removes numbers & special chars (except spaces)
                                setName(onlyLetters.charAt(0).toUpperCase() + onlyLetters.slice(1));
                            }}
                        />
                    </fieldset>

                    {/* Birthday Input Component */}
                    <div className="lg:w-full">
                        <BirthdayInput month={month} setMonth={setMonth} day={day} setDay={setDay} />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                        <button className="w-full btn btn-primary" type="submit">
                            Get Horoscope
                        </button>
                    </div>

                </div>
            </form>
        </div>
    );
};

export default HoroscopeForm;
