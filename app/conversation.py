import os
import json
import openai
from typing import List, Dict, Any, Optional

class ConversationManager:
    """Manages the conversation state and interactions with the AI"""
    
    def __init__(self):
        self.system_role = ""
        self.assistant_role = ""
        self.scenario = ""
        self.conversation_history = []
        
        self.role_prompts = {
            "sales specialist": {
                "product_pitch": "You are a sales SPECIALIST pitching a software solution. Confidently explain product features, demonstrate value, and engage the customer with clear, compelling communication.",
                "objection_handling": "You are a sales SPECIALIST responding to customer concerns. Listen carefully, address objections directly, and guide the conversation towards a positive resolution.",
                "negotiation": "You are a sales SPECIALIST negotiating terms. Be strategic, find win-win solutions, and demonstrate the value of your offering.",
                "upselling": "You are a sales SPECIALIST suggesting premium options. Highlight additional benefits, show how upgrades solve specific customer needs."
            },
            "customer": {
                "product_pitch": "You are a CUSTOMER evaluating a software solution. Ask probing questions, express genuine interest or skepticism, and seek clear value proposition.",
                "objection_handling": "You are a CUSTOMER raising specific concerns about the product. Be critical but open to hearing solutions.",
                "negotiation": "You are a CUSTOMER negotiating purchase terms. Focus on your needs, budget constraints, and seek the best possible deal.",
                "upselling": "You are a CUSTOMER considering product upgrades. Be discerning, ask about specific benefits, and only consider upgrades that provide clear value."
            }
        }
        
        self.scenario_prompts = {
            "product_pitch": "The conversation is a product introduction where the sales specialist is presenting a new software solution to a potential customer. The customer is evaluating several options and needs to be convinced of this product's unique value.",
            "objection_handling": "The conversation follows an initial pitch where the customer has expressed several reservations about moving forward. The sales specialist needs to address these concerns professionally to keep the opportunity alive.",
            "negotiation": "The conversation is at the final stage where both parties are discussing pricing, terms, and implementation details. This is a critical moment to find an agreement that satisfies both sides.",
            "upselling": "The conversation is with an existing customer who already uses the basic version of a product. The sales specialist is suggesting premium features or complementary products that could provide additional value."
        }
    
    def init_conversation(self, system_role: str, assistant_role: str, scenario: str):
        """Initialize a new conversation with specified roles and scenario"""
        self.system_role = system_role.lower()
        
        # If assistant_role is not provided, set it to the opposite of system_role
        if not assistant_role:
            self.assistant_role = "customer" if system_role == "sales specialist" else "sales specialist"
        else:
            self.assistant_role = assistant_role.lower()
            
        self.scenario = scenario.lower()
        self.update_system_message()
        
        return {
            "system_role": self.system_role,
            "assistant_role": self.assistant_role,
            "scenario": self.scenario
        }
    
    def get_role_guidance(self) -> str:
        """Get role-specific guidance for the current scenario"""
        if not self.system_role or not self.scenario:
            return "Please start a conversation first."
        
        return self.role_prompts[self.system_role][self.scenario]
    
    def update_system_message(self):
        """Update the system message in the conversation history"""
        system_prompt = f"""
        ROLE CONFIGURATION:
        - YOU ARE: {self.assistant_role.upper()}
        - CONVERSATION PARTNER IS: {self.system_role.upper()}

        SCENARIO: {self.scenario_prompts[self.scenario]}

        ROLE-SPECIFIC INSTRUCTIONS:
        {self.role_prompts[self.assistant_role][self.scenario]}

        CRITICAL INSTRUCTIONS:
        1. Always maintain the assigned role of {self.assistant_role.upper()}
        2. Respond consistently within the context of the {self.scenario.replace('_', ' ')} scenario
        3. Do not switch or question your role during the conversation
        4. Engage naturally and contextually with your conversation partner

        Respond directly and stay true to your assigned role as the {self.assistant_role.upper()}.
        """
        
        # Reset conversation history with the clear system message
        self.conversation_history = [{"role": "system", "content": system_prompt}]
    
    def switch_roles(self):
        """Switch the roles between system and assistant"""
        self.system_role, self.assistant_role = self.assistant_role, self.system_role
        self.update_system_message()
        
        return {
            "system_role": self.system_role,
            "assistant_role": self.assistant_role
        }
    
    def switch_scenario(self, new_scenario: str):
        """Switch to a different conversation scenario"""
        if new_scenario.lower() in self.scenario_prompts:
            self.scenario = new_scenario.lower()
            self.update_system_message()
            return True
        return False
    
    def reset_conversation(self):
        """Reset the current conversation while maintaining roles and scenario"""
        self.update_system_message()
    
    def get_ai_response(self, user_message: str) -> str:
        """Get AI response for the user message"""
        # Add user message to conversation history
        self.conversation_history.append({"role": "user", "content": user_message})
        
        try:
            # Get response from OpenAI
            client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            response = client.chat.completions.create(
                model="gpt-4-turbo",
                messages=self.conversation_history,
                temperature=0.5,
                max_tokens=500,
                stop=[f"You ({self.system_role}):", f"You ({self.assistant_role}):"]
            )
            
            # Extract and process response
            response_text = response.choices[0].message.content
            
            # Add AI response to conversation history
            self.conversation_history.append({"role": "assistant", "content": response_text})
            
            return response_text
            
        except Exception as e:
            error_message = f"Error: Unable to get AI response. Details: {str(e)}"
            # Add error message to conversation history to maintain context
            self.conversation_history.append({"role": "assistant", "content": error_message})
            return error_message
    
    def analyze_conversation(self) -> Dict[str, Any]:
        """Analyze the conversation and provide feedback"""
        if len(self.conversation_history) <= 1:
            return {"error": "Not enough conversation history to analyze."}
        
        analysis_prompt = {
            "role": "system",
            "content": """
            Analyze the conversation between the sales specialist and customer for:
            - Strengths: What communication techniques worked well
            - Weaknesses: Areas where communication could be improved
            - Key moments: Critical turning points in the conversation
            - Improvement suggestions: Specific, actionable tips for more effective communication
            - Role-specific feedback: Tailored advice based on whether the user was acting as the sales specialist or customer
            
            Return the response as JSON with these categories as keys.
            """
        }

        analysis_messages = [analysis_prompt] + self.conversation_history[1:]
        
        try:
            # Get analysis from OpenAI
            client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            response = client.chat.completions.create(
                model="gpt-4-turbo",
                messages=analysis_messages,
                temperature=0.3,
                max_tokens=1000
            )
            
            # Parse and return feedback
            try:
                feedback = json.loads(response.choices[0].message.content)
                return feedback
            except json.JSONDecodeError:
                # Handle case where response isn't valid JSON
                return {"error": "Unable to parse analysis response as JSON."}
                
        except Exception as e:
            return {"error": f"Unable to analyze conversation. Details: {str(e)}"}